# SMIRE AI — Architecture & Agent Reference

SMIRE is a **Generative AI medical assistant platform**: agentic web-search
lookups (clinics, doctors, news — being migrated from CrewAI to LangGraph,
see below) plus a **RAG pipeline** over a user's own uploaded medical reports
for personalized Q&A. This file is
the single source of truth for cross-cutting architecture. Each agent/service
has its own doc in [docs/agents/](docs/agents/) — read this file first, then
the relevant agent doc before touching that feature.

**Keep this file and `docs/agents/*.md` up to date as we build.** Whenever an
agent's prompt, tools, model, or data flow changes, update its doc in the same
change. When a new page/agent is added, add a new file under `docs/agents/`
and link it below.

## Repo layout

```
backend/    FastAPI app (Python) — all AI agents/services live here
frontend/   Next.js 16 (App Router) — one page per product surface
```

## Backend architecture

- **Entry point**: [backend/main.py](backend/main.py) — creates the FastAPI
  app, sets global OpenAI/Serper env vars from `Settings`, mounts CORS
  (currently `allow_origins=["*"]` — tighten before prod), and includes all
  routers under `/api`. Also hosts a few ungrouped endpoints directly (medical
  record CRUD, Twilio voice webhooks) that predate the `api/` router split —
  new endpoints should go in `backend/api/*.py` instead.
- **Routers** (`backend/api/*.py`) are thin — they parse the request, call a
  service function, and shape the JSON response. No agent/LLM logic belongs
  in a router.
- **Services** (`backend/services/*.py`) hold all the agent/LLM logic. Each
  page's "agent" is a service module — see [docs/agents/](docs/agents/) for
  per-agent detail:
  - [clinic_service.md](docs/agents/clinic_service.md) — Search page
  - [book_service.md](docs/agents/book_service.md) — Book page (doctor search
    + Twilio call booking)
  - [news_service.md](docs/agents/news_service.md) — News page
  - [consult_service.md](docs/agents/consult_service.md) — Consult (OPD) page
  - [manage_service.md](docs/agents/manage_service.md) — Manage page (RAG:
    report upload, ingestion, retrieval-augmented insights chat)
- **models.py**: shared Pydantic request/response schemas.
- **settings.py**: reads env vars (`DATABASE_URL`, `OPENAI_API_KEY`,
  `SERPER_API_KEY`, `SMTP_*`) via `python-dotenv`. Other services read
  `os.getenv` directly instead of going through `Settings` (Pinecone, Gemini,
  LlamaParse keys) — inconsistent today, worth consolidating into `Settings`
  as the codebase grows.
- **Persistence**: Postgres (`psycopg2`, raw SQL, no ORM in use yet despite
  `sqlalchemy`/`alembic` being in requirements) for `medical_recs` (medicine
  logs + report metadata) and `conversation_logs` (manage/RAG chat history —
  also doubles as that agent's own memory store, see
  [manage_service.md](docs/agents/manage_service.md)); Pinecone (vector index
  `smire`, namespace `medical_reports`, chunked with `user_id` metadata for
  per-user isolation) for report embeddings used by RAG. Neither Postgres
  table has a migration file anywhere in this repo — both were created by
  running `CREATE TABLE` directly against `DATABASE_URL`.
- **Uploads**: PDFs land in `backend/uploads/` on disk (not object storage —
  README calls out S3/Firebase as "yet to implement").

### Agent migration: CrewAI → LangGraph (complete)

SMIRE was migrated agent-by-agent from CrewAI/direct-LLM clients to
hand-written LangGraph `StateGraph`s, to add schema-enforced structured
output and a real validate/retry loop (a graph cycle) in place of
prompt-enforced JSON with no validation. Migration order (simplest → most
complex, chosen to build up LangGraph concepts progressively): **news →
clinic/doctor search → consult → manage/RAG**.

**Status**: news ✅, clinic ✅, doctor/book search ✅ (2026-07-06), consult ✅,
manage/RAG ✅ (2026-07-07) — **all four agents migrated, roadmap complete.**
(Note: the Twilio *booking* half of `book_service`/`api/book.py` was never an
agent — it's been replaced with an email + `.ics` calendar reminder flow, a
separate task from this migration — see
[docs/agents/book_service.md](docs/agents/book_service.md).)

**Style rule for all migrated agents**: minimal and explicit, optimized for
learning/debugging over cleverness — one flat `StateGraph` per agent in its
own `services/*.py` file, plain node functions, no shared base classes or
graph-builder abstractions across agents (even where logic rhymes) until the
same code has been copy-pasted 3+ times.

Every agent is now a LangGraph `StateGraph` with explicit nodes, an LLM step,
and a validation/grading node with a conditional edge that loops back on
failure (bounded retries). **What gets validated/retried differs by agent,
on purpose** — this is the main thing to internalize before touching any of
them:
- **news**: validates/retries the *LLM write step* (structured-output
  formatting).
- **clinic/doctor search**: validates/retries the *search step* instead (see
  [clinic_service.md](docs/agents/clinic_service.md) for why — a real
  hallucination bug found during that migration, caused by too-thin search
  context, drove that design difference).
- **consult**: validates the *answer itself*, and separately uses a
  `trim_history` node purely for context engineering (bounding prompt size),
  not retry (see [consult_service.md](docs/agents/consult_service.md)).
- **manage/RAG**: the most advanced — `retrieve` → `grade_documents`
  (an LLM judges *relevance*, not just retrieval similarity) → retry
  `retrieve` with a wider `top_k` if nothing graded relevant, else
  `generate_answer` → `log_conversation` (Postgres). Also fixed real
  per-user data isolation (Pinecone queries are now filtered by `user_id`,
  which didn't exist as metadata before) and an embedding-model retirement
  (`text-embedding-004` 404s now; replaced with `gemini-embedding-001` at
  matching dimensionality) — see
  [manage_service.md](docs/agents/manage_service.md).

Read the four agent docs for the concrete patterns to reuse (not literally
share code) when adding a new agent.

## Frontend architecture

- **Next.js App Router**, one route per product surface, all client
  components (`"use client"`) that call the FastAPI backend directly via
  `fetch` using `NEXT_PUBLIC_API_URL`. There is no server-side API layer/BFF —
  the browser talks straight to FastAPI.
- **Routes → backend service mapping** (`/search` and `/book` were merged
  into a single tabbed `/book` page on 2026-07-07 — they were near-identical
  fetch-and-render flows):
  | Route | Calls | Agent doc |
  |---|---|---|
  | `/book` (Clinics tab) | `GET /api/get-clinics` | [clinic_service.md](docs/agents/clinic_service.md) |
  | `/book` (Doctors tab) | `GET /api/get-doctors`, `POST /api/add-to-calendar` | [book_service.md](docs/agents/book_service.md) |
  | `/news` | `GET /api/get-news` | [news_service.md](docs/agents/news_service.md) |
  | `/consult` | `POST /api/get-consultation` | [consult_service.md](docs/agents/consult_service.md) |
  | `/manage` | `POST /api/upload-report`, `POST /api/get-insights`, `/add-record`, `/get-records/{id}`, `/delete-record` | [manage_service.md](docs/agents/manage_service.md) |
- **Auth**: Supabase (`@supabase/supabase-js`), client-side only
  ([frontend/src/lib/supabaseClient.js](frontend/src/lib/supabaseClient.js)).
  [AuthWrapper.tsx](frontend/src/components/AuthWrapper.tsx) gates every
  interior page (via `AppShell`, see below) by checking
  `supabase.auth.getSession()` client-side and redirecting to `/auth/login`
  if absent — this is UX-level gating only, **not** a security boundary (no
  server-side session check, no auth on backend endpoints yet). Backend
  endpoints currently do not verify the Supabase JWT; `user_id` is passed as
  a plain string from the client — every page now sends the real Supabase
  user id (the Manage page's `"ashar534"` hardcode was fixed 2026-07-07), but
  the backend still trusts whatever `user_id` string it's given rather than
  verifying it cryptographically — don't treat any backend endpoint as
  authenticated until real JWT verification is wired up.
- **`actions.ts`** is dead/commented-out code (a Supabase server-actions
  pattern that was never finished) — auth is actually done client-side in
  `auth/login` and `auth/register` pages directly.
- **Styling**: Tailwind + shadcn/ui (`components.json`, CSS vars in
  `globals.css`), **light theme, blue primary accent** (`--primary` ≈ blue-600).
  All pages are built on shared primitives in `frontend/src/components/ui/*`
  (`button`, `input`, `label`, `card`, `tabs`, `dialog`, `badge`, `textarea`,
  `alert`, `skeleton`, `loading`) — extend these rather than hand-rolling
  markup/colors in a page. `frontend/src/components/layout/AppShell.tsx`
  wraps `AuthWrapper` + `Navbar` + a `max-w-6xl` container and is used by
  every interior page (`/`, `/book`, `/news`, `/consult`, `/manage`);
  `auth/login` and `auth/register` intentionally skip it (centered
  unauthenticated `Card` layout instead). `Navbar.tsx` is the single place
  nav links + the profile/logout menu are defined — don't re-add per-page nav.

## Environment variables

Backend (`backend/.env`, never commit): `DATABASE_URL`, `OPENAI_API_KEY`,
`GROQ_API_KEY`, `SERPER_API_KEY`, `PINECONE_API_KEY`, `GOOGLE_API_KEY`,
`LLAMA_CLOUD_API_KEY`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
`SMTP_PASSWORD`, `SMTP_FROM` (used by the "Add to Calendar" reminder email;
Gmail + app password, configured and verified end-to-end 2026-07-07),
`PHIDATA_API_KEY` (unused currently).
`TWILIO_*` vars are no longer used — the Twilio booking flow was replaced by
email + `.ics` on 2026-07-07 (see
[docs/agents/book_service.md](docs/agents/book_service.md)); safe to remove
from `.env` whenever convenient.

Frontend (`frontend/.env.local`): `NEXT_PUBLIC_API_URL`,
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Known rough edges (context for future work, not asks to fix opportunistically)

- CORS wide open (`*`), no backend auth/JWT verification — fine for a demo,
  must be closed before any real user data goes through this. All pages now
  send the *real* Supabase user id (fixed 2026-07-07), but the backend still
  doesn't verify it's genuine — this is the next natural step if you want to
  actually close this gap.
- No ORM despite SQLAlchemy/Alembic being installed; all SQL is raw
  `psycopg2` in routers/main.py.
- `manage_service.py`'s chunking is fixed-size character splitting, not
  table-structure-aware — a markdown table split across a chunk boundary can
  separate a value from its label. The corrective-RAG grading step declines
  rather than hallucinating in that case, but doesn't recover the split data
  (see [docs/agents/manage_service.md](docs/agents/manage_service.md)).
- Consult's thread persistence (`localStorage`) was deliberately kept
  separate from the new `conversation_logs` Postgres table — not migrated,
  a possible future follow-up.

## Conventions going forward

- New page/feature = new FastAPI router in `backend/api/`, new service module
  in `backend/services/`, and a new (or updated) doc in `docs/agents/`.
- Keep prompt text, tool list, and expected output shape for each agent
  documented in its `docs/agents/*.md` file so prompt changes are reviewable
  independent of code diffs.
