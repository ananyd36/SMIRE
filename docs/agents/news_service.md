# Medical News Agent

**Page**: `/news` ([frontend/src/app/news/page.tsx](../../frontend/src/app/news/page.tsx))
**Router**: `GET /api/get-news` ([backend/api/news.py](../../backend/api/news.py))
**Service**: [backend/services/news_service.py](../../backend/services/news_service.py)

## What it does

Fetches and summarizes recent medical/fitness news for a general audience —
no personalization, no user input (`get_medical_news()` takes no arguments).

**Migrated from CrewAI to LangGraph on 2026-07-06** — the first agent
migrated, chosen deliberately as the simplest one to learn LangGraph's core
building blocks (state, nodes, edges, a conditional-edge retry loop) before
tackling the trickier agents. See [CLAUDE.md](../../CLAUDE.md) for the
overall migration rationale/checklist.

## Pattern: 3-node `StateGraph` with a bounded validate/retry loop

```
search_news → write_articles → validate_articles ─┬─ valid, or 2 attempts used → END
                    ↑ ────────────────────────────┘ not valid, attempts < 2 → retry
```

State (`NewsState`, a `TypedDict`):
```python
class NewsState(TypedDict):
    raw_results: list[dict]   # raw Serper /news results
    articles: list[dict]      # final Title/Link/Snippet dicts
    attempts: int             # write_articles calls made so far
    valid: bool                # did validate_articles pass
```

- **`search_news`** — no LLM call. Calls Serper's `/news` endpoint directly
  via `requests` (using `Settings.SERPER_API_KEY`), asking for 10 results.
  This replaced CrewAI's `SerperDevTool` + `ScrapeWebsiteTool` combo — Serper's
  news endpoint already returns `title`/`link`/`snippet` per article, so no
  separate scrape step is needed.
- **`write_articles`** — the only LLM call (`ChatOpenAI`, `gpt-3.5-turbo`).
  Takes the raw Serper results and produces a structured `ArticleList`
  (Pydantic model, list of `{Title, Link, Snippet}`) via
  `.with_structured_output(ArticleList)`. Field names are capitalized
  (`Title`/`Link`/`Snippet`) specifically to match the existing frontend
  contract with zero mapping needed. The prompt keeps the original agent's
  "fun, encouraging tone for an average adult" framing. Note: `gpt-3.5-turbo`
  doesn't support OpenAI's native `json_schema` structured-output mode —
  langchain automatically falls back to `method='function_calling'` (logged
  as a `UserWarning`, expected and harmless).
- **`validate_articles`** — no LLM call, plain Python: passes if there are
  ≥4 articles and every one has a non-empty `Title` and `Link`.
- **Retry logic**: on failure, loops back to `write_articles` (**not**
  `search_news`) — a formatting/validation failure is an LLM output problem,
  not a missing-data problem, since the raw search results are already in
  state. Bounded at `MAX_WRITE_ATTEMPTS = 2` total attempts; if still invalid
  after that, returns whatever was last produced rather than erroring (no
  hard failure mode today — see rough edges).

This is a real behavior observed in testing: attempt 1 sometimes produces
only 2-3 valid articles, `validate_articles` catches it, and attempt 2
succeeds — the loop is not just theoretical, it fires in practice.

## Output contract (now schema-enforced, not string-parsed)

`get_medical_news()` returns a plain `list[dict]` directly (no more
`json.loads(str(result))` in the router). Router:
```python
@router.get("/get-news")
async def get_news():
    return {"status": "success", "articles": get_medical_news()}
```
Malformed LLM output is now a Pydantic validation error inside
`with_structured_output`, not a silent `json.loads` crash — though note that
error isn't currently caught anywhere (see rough edges).

## Frontend consumption

Unchanged — `NewsPage` still expects `{Title, Link, Snippet}` per article;
this migration was designed to be a zero-frontend-diff change.

## Known rough edges

- No caching — every page load re-runs the full graph (1-2 LLM calls +
  1 Serper call) live.
- If both `write_articles` attempts fail validation, the endpoint still
  returns a 200 with whatever the second attempt produced (possibly fewer
  than 4 articles) rather than surfacing an error — acceptable for now since
  news content is low-stakes, but worth revisiting once the retry pattern
  is reused on higher-stakes agents (clinic/doctor search).
- `search_news` doesn't handle Serper request failures (network error, rate
  limit) — an uncaught exception there will 500 the endpoint.
