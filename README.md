# SMIRE AI 😊

**SMIRE AI** is a Generative AI medical assistant: an agentic + RAG platform
for finding clinics/doctors, medical news, general consultation, and
insights over your own uploaded medical reports.

**Live**: [smirefrontend.vercel.app](https://smirefrontend.vercel.app) (frontend) ·
backend at `smire-backend.onrender.com` (free tier — may take 30-60s to
wake up if idle).

For the full architecture, every agent's design, and current known
limitations, see [CLAUDE.md](CLAUDE.md) and [docs/agents/](docs/agents/) —
this README is just the quick tour.

## Features

- **Find & Book Clinics/Doctors** (`/book`) — geo-scoped clinic and doctor
  search (Google Maps via Serper), with an "Add to Calendar" reminder +
  email confirmation for a selected appointment slot.
- **Medical News** (`/news`) — recent medical/health news, summarized.
- **Consult** (`/consult`) — general medical Q&A chat with ChatGPT-style
  persisted conversation threads (multiple parallel conversations, stored
  in your browser).
- **Manage** (`/manage`) — log medications, upload medical reports (PDF →
  parsed, chunked, embedded), and chat with your own reports via a
  corrective-RAG pipeline that only answers from your real data (and says
  so honestly when it can't).
- **Auth**: Supabase email/password.

## Architecture at a glance

- **Frontend**: Next.js (App Router) + Tailwind + shadcn/ui, deployed on
  Vercel.
- **Backend**: FastAPI, deployed on Render. Every agent (news, clinic/doctor
  search, consult, manage/RAG) is a hand-written **LangGraph** `StateGraph`
  — structured LLM output, validation/grading nodes, and bounded retry
  loops instead of hoping the model gets it right the first time.
- **Data**: Postgres (Supabase) for medicine/report records and
  conversation logs; Pinecone for report embeddings, scoped per user.
- **LLMs**: OpenAI (`gpt-3.5-turbo`) for news/clinic/doctor/consult; Gemini
  for manage/RAG (embeddings + grading + generation).

See [CLAUDE.md](CLAUDE.md) for the full breakdown, including which
tradeoffs were made deliberately and what's still a known rough edge.

## Local development

**Backend**:
```bash
cd backend
source venv/bin/activate   # or create one: python -m venv venv
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
Needs a `backend/.env` with `DATABASE_URL`, `OPENAI_API_KEY`,
`SERPER_API_KEY`, `PINECONE_API_KEY`, `GOOGLE_API_KEY`,
`LLAMA_CLOUD_API_KEY`, `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASSWORD`
(see [CLAUDE.md](CLAUDE.md) for what each is used for).

**Frontend**:
```bash
cd frontend
npm install
npm run dev
```
Needs a `frontend/.env.local` with `NEXT_PUBLIC_API_URL`,
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Deploying your own copy

Both services are configured for free hosting — see the **Deployment**
section in [CLAUDE.md](CLAUDE.md) for the exact setup (Render blueprint,
Supabase pooler connection gotcha, Vercel env vars).
