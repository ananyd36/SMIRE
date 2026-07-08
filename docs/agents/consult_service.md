# Consult (OPD) Agent

**Page**: `/consult` ([frontend/src/app/consult/page.tsx](../../frontend/src/app/consult/page.tsx))
— redesigned 2026-07-07 into a ChatGPT-like two-pane UI: a left sidebar of
persisted conversation threads (create/switch/delete) and a chat panel on
the right, replacing the old single flat conversation.
**Router**: `POST /api/get-consultation` ([backend/api/consult.py](../../backend/api/consult.py))
**Service**: [backend/services/consult_service.py](../../backend/services/consult_service.py)

## What it does

General-purpose medical Q&A chat ("I have a headache, what could it be?").

**Migrated from a raw LangChain chain to LangGraph on 2026-07-07**, following
the same pattern established by news/clinic/doctor search — see
[news_service.md](news_service.md) for the base pattern this builds on.

## Pattern: 3-node `StateGraph` with context-engineered history + a validate/retry loop

```
trim_history → answer_question → validate_answer ─┬─ valid, or 2 attempts → END
                      ↑ ─────────────────────────  ┘ empty answer, attempts < 2 → retry
```

State (`ConsultState`, a `TypedDict`):
```python
class ConsultState(TypedDict):
    question: str
    history: list[dict]          # raw {query, response} pairs from the client
    windowed_history: list[dict]  # trimmed context actually sent to the LLM
    answer: str
    attempts: int
    valid: bool
```

- **`trim_history`** — no LLM. Keeps only the last `MAX_HISTORY_TURNS` (6)
  entries from `history`. **This is the fix for the "bloated context"
  problem**: previously the entire raw conversation history was stuffed into
  every prompt with no bound, so a long-running thread (now that threads
  persist indefinitely in the frontend, see below) would make every turn
  slower and more expensive. Now the prompt size is capped regardless of how
  long the conversation has grown.
- **`answer_question`** — the one LLM call (`ChatOpenAI`, `gpt-3.5-turbo`,
  `temperature=0`), built from `windowed_history` + `question`. **This also
  fixes a real bug**: the old implementation called
  `chain.invoke(question)`, discarded the result, then called
  `chain.invoke(input=question)` again — every consult request was paying
  for two LLM calls to produce one answer. Now it's a single call per
  attempt.
- **`validate_answer`** — plain Python: passes if the answer is non-empty.
  Retries `answer_question` once on failure (bounded at `MAX_ATTEMPTS = 2`),
  same shape as the other migrated agents.
- The previously-imported-but-unused `ConversationBufferWindowMemory` is
  gone — `trim_history` does that job explicitly and visibly instead.

## Frontend: threaded, localStorage-backed UI (2026-07-07)

Replaces the old single-conversation page with a ChatGPT-style layout:

- **`frontend/src/lib/threadStorage.ts`** — plain functions (no new
  dependency, no state library), backed by `window.localStorage` under key
  `smire.consult.threads`. `ConsultThread = {id, title, createdAt, updatedAt,
  messages}`. `createThread()` uses `crypto.randomUUID()`; `deriveTitle()`
  truncates the first question to build a ChatGPT-style title.
- **`consult/page.tsx`** — two-pane layout inside `AppShell`: a left sidebar
  (collapsible on mobile via a toggle button, same responsive spirit as
  `Navbar`) listing threads sorted by `updatedAt`, a "+ New Chat" button, and
  a delete (trash icon, `lucide-react`) per thread guarded by
  `window.confirm`. The right pane is the existing chat-bubble UI, now
  reading/writing the *active thread's* `messages` instead of one global
  `history` array.
- On send, the frontend still sends the **entire** active thread's messages
  as `history` in the request — deliberately not pre-trimmed client-side,
  since the backend's `trim_history` node already bounds what reaches the
  LLM. This keeps the frontend simple (no duplicate trimming logic) while
  still getting the context-engineering benefit server-side.
- Threads persist across browser restarts (`localStorage`, not the literal
  `sessionStorage` API) — verified via a real reload in testing, both
  threads and their full message history survived intact.

**Not changed by this redesign**: the home page's (`/`) quick-ask dialog
still calls the same `POST /api/get-consultation` endpoint with a one-off
`history: []` — it was deliberately kept as a lightweight single-question
popup, not folded into the thread system.

## Output contract

Unchanged: `{"status": "success", "answer": "..."}`, plain string rendered
as Markdown via `react-markdown`. No JSON parsing risk (unlike the
CrewAI/LangGraph search agents which return structured lists).

## Known rough edges

- No RAG/document grounding — if a user expects this to know about their own
  uploaded reports, that's the [manage_service](manage_service.md) agent's
  job, not this one.
- No per-user/account isolation of threads — `localStorage` is scoped to
  the browser, not the logged-in Supabase user, so switching accounts on the
  same browser sees the same thread list. Not a concern today since there's
  no multi-account-on-one-browser use case yet, but worth knowing.
- No thread rename (create/switch/delete only, by design — kept the sidebar
  scope tight).
- `MAX_HISTORY_TURNS = 6` is a fixed constant, not configurable per
  conversation.
