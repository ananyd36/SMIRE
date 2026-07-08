# Manage / RAG Agent (medical report ingestion + insights chat)

**Page**: `/manage` ([frontend/src/app/manage/page.tsx](../../frontend/src/app/manage/page.tsx))
**Router**: [backend/api/manage.py](../../backend/api/manage.py) — `POST /api/upload-report`, `POST /api/get-insights`
(plus non-RAG record CRUD on `main.py`: `POST /add-record`, `GET /get-records/{user_id}`, `POST /delete-record`)
**Service**: [backend/services/manage_service.py](../../backend/services/manage_service.py)

**Migrated from a raw `google-genai` client to LangGraph (corrective RAG) on
2026-07-07** — the last agent in the CrewAI/direct-LLM → LangGraph migration.
See [CLAUDE.md](../../CLAUDE.md) for the overall migration rationale and
[news_service.md](news_service.md)/[clinic_service.md](clinic_service.md) for
the patterns this one builds on.

## Three sub-features on one page

1. **Log Medicine** — plain CRUD against Postgres `medical_recs`, no AI.
2. **Upload Reports** — ingestion pipeline (chunking + embedding, below).
3. **Chat with Reports** — the corrective-RAG graph, below.

## What changed, and why

The pre-migration version had the worst rough edges of any agent in this
app: **no per-user isolation** (Pinecone had no `user_id` at all — every
uploaded report from every user lived in one undifferentiated namespace),
**no chunking** (a whole parsed report became one oversized vector),
**`top_k=1`** (only ever retrieved a single chunk, no matter how many
existed), an **unstable vector ID** (`str(hash(text))` — not stable across
processes since Python salts `hash()` by default), and **duplicated
embedding/Pinecone-init code** between the router and the service. All of
this is fixed now.

**Also discovered during migration**: `text-embedding-004` (the embedding
model the original code used) has been retired by Google — every call to it
now 404s. Replaced with `gemini-embedding-001`, using
`output_dimensionality=768` to keep producing vectors compatible with the
existing Pinecone index (which is dimension 768) with zero data migration
needed.

## Pattern: 5-node `StateGraph`, corrective RAG

```
load_history → retrieve → grade_documents ─┬─ relevant, or 2 attempts → generate_answer → log_conversation → END
                              ↑ ───────────┘ nothing relevant, attempts < 2 → retry (wider top_k)
```

State (`ManageState`, a `TypedDict`):
```python
class ManageState(TypedDict):
    user_id: str
    query: str
    top_k: int
    history: list[dict]           # last few Q&A pairs for this user, from Postgres
    chunks: list[dict]            # raw retrieved {text, report_name, score}
    graded_chunks: list[dict]     # subset an LLM judged actually relevant
    has_relevant_context: bool
    answer: str
    attempts: int
```

- **`load_history`** — no LLM. `SELECT query, response FROM
  conversation_logs WHERE user_id = %s ORDER BY created_at DESC LIMIT 6`,
  reversed to chronological order. This is the "conversational memory"
  feature — sourced from the durable Postgres log (see below), so the
  frontend never needs to track or resend history; the request contract
  stays `{user_id, query}`, unchanged from before the migration.
- **`retrieve`** — embeds the query (`generate_embeddings`, Gemini
  `gemini-embedding-001` @ 768 dims), queries Pinecone with
  `filter={"user_id": {"$eq": user_id}}` (**the actual per-user isolation
  fix**) and `top_k=state["top_k"]` (starts at 4, was 1 before migration).
  On retry, widens `top_k` by 4 (same "widen scope on retry" idea already
  used for clinic/doctor search) — bounded at `MAX_ATTEMPTS = 2`.
- **`grade_documents`** — one LLM call (`ChatGoogleGenerativeAI` via
  `langchain-google-genai`, `.with_structured_output(GradingResult)`)
  grading all retrieved chunks at once against the query — the actual
  corrective-RAG step, judging *relevance* (does this chunk answer the
  question) not just retrieval *similarity* (which Pinecone already
  filtered on). **Correctness note discovered in testing**: the first
  version of this prompt didn't explicitly demand one grade per chunk, and
  the LLM silently returned a grade for only chunk 0, causing every other
  chunk to be dropped by omission rather than genuine rejection. Fixed the
  same way news/clinic/doctor's "return exactly N" prompts were fixed —
  the prompt now explicitly states the exact chunk count and demands a
  grade for every index.
- **route after grading**: relevant chunks found, or attempts exhausted →
  `generate_answer`; otherwise → back to `retrieve` with a wider `top_k`.
- **`generate_answer`** — if `has_relevant_context`: one LLM call using
  `graded_chunks` + `history` + `query`, keeping the original prompt's
  domain framing (TSH/diabetes/metformin few-shot examples). If not (even
  after retries): skips the LLM entirely, uses the same canned message that
  was already in place ("The provided context does not contain sufficient
  information...").
- **`log_conversation`** — no LLM. `INSERT INTO conversation_logs (user_id,
  query, response)`. Runs regardless of which path `generate_answer` took,
  so even "insufficient info" answers are logged (and this is what
  `load_history` reads back on the next call).

**Verified in testing** (real PDF upload, real Gemini/Pinecone calls): a
query with no cleanly-extracted answer (`"What was my TSH level?"` — the
source report only listed TSH as "test ready," never captured the numeric
result in any single chunk) correctly triggered the retry-then-decline path
rather than fabricating a number; a query with the answer actually present
in one chunk (`"What was my total cholesterol level?"`) correctly retrieved,
graded, and answered from real data (177 mg/dL, matching the source PDF).

## Postgres `conversation_logs` table (new)

No migration framework exists in this repo (same as `medical_recs`, which
also has no `CREATE TABLE` anywhere in the codebase) — this table was
created directly against `DATABASE_URL`:
```sql
CREATE TABLE conversation_logs (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    query TEXT NOT NULL,
    response TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT now()
);
```
This is both an audit log and the RAG agent's own memory store (via
`load_history`) — a deliberate unification rather than two separate
mechanisms.

## Ingestion pipeline (`POST /api/upload-report`, `backend/api/manage.py`)

1. File saved to disk under `backend/uploads/` with a
   `f"{uuid.uuid4()}_{original_filename}"` name — fixes the old filename
   collision/overwrite risk (previously saved under the raw client-provided
   filename).
2. `process_pdf_with_llama_parse` — unchanged: LlamaParse parses the PDF into
   markdown.
3. `chunk_and_upsert` (new) — splits the parsed text with
   `RecursiveCharacterTextSplitter` (`langchain_text_splitters`, chunk size
   1000, overlap 100) instead of embedding the whole document as one vector.
   Each chunk gets its own embedding and its own Pinecone vector with
   `id=str(uuid.uuid4())` (stable, replaces the old `str(hash(text))`) and
   metadata `{user_id, report_name, chunk_index, text}`.
4. `generate_embeddings`/Pinecone client init now live **only** in
   `manage_service.py` — the router imports them instead of maintaining its
   own duplicate copies (previously `api/manage.py` and
   `services/manage_service.py` each had independent, slightly-diverging
   copies of this logic, including a `GEMINI_API_KEY` vs `GOOGLE_API_KEY`
   env var mismatch in the router's copy — that whole duplicate is gone
   now).
5. The `medical_recs` row insert (for the record-list UI) is unchanged —
   still has no direct link to the Pinecone vectors it corresponds to,
   which is fine since they're not looked up by that relationship anywhere.

## Frontend: real `user_id`

`manage/page.tsx` no longer hardcodes `userId = "ashar534"` — it fetches
`supabase.auth.getUser()` on mount (same pattern as `Navbar.tsx`/
`book/page.tsx`) and uses the real Supabase UUID everywhere: `add-record`,
`get-records`, `delete-record`, `upload-report`, `get-insights`. Form
submit handlers guard against `userId` still being null (auth check not yet
resolved) with a "still loading your account" message rather than sending a
broken request.

**Still not done** (explicitly out of scope, consistent with every other
agent in this migration): the backend does not verify the Supabase JWT —
it trusts whatever `user_id` the client sends. The fix here is that the
frontend now sends the *real* id instead of a hardcoded fake one, not that
requests are cryptographically authenticated. Full backend auth remains a
separate, larger task.

## Output contract

Unchanged nested shape (kept deliberately, to avoid touching the frontend):
```python
# manage_service.py
def get_chat_response(user_id, query) -> dict:
    ...
    return {"status": "success", "response": answer_text}
```
```python
# api/manage.py router
response = get_chat_response(user_id, query)
return {"status": "success", "response": response}
```
So the HTTP response is `{"status": "success", "response": {"status":
"success", "response": "<answer>"}}` — the frontend's `data.response.response`
still resolves correctly.

## Known rough edges

- Still no backend JWT verification (see above) — same gap as every other
  endpoint in this app.
- `chunk_and_upsert` uses fixed-size character chunking, not
  table-structure-aware splitting — as observed in testing, a markdown
  table split across chunk boundaries can separate a value from the row
  label that gives it meaning. The corrective-RAG grading step catches the
  resulting "chunk doesn't actually answer this" case and declines rather
  than hallucinating, but the retrieval itself doesn't recover the split
  data. A future improvement would be table-aware chunking (keep whole
  markdown tables together) rather than raw character-count splitting.
- No de-duplication if the same report is uploaded twice — it'll simply
  create a second full set of chunks.
- Consult's thread persistence (`localStorage`) was deliberately **not**
  migrated to this same Postgres table in this pass — a separate, still-open
  follow-up if wanted later (see `docs/agents/consult_service.md`).
