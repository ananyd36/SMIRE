# SMIRE backend

FastAPI backend for SMIRE AI. See the root [README.md](../README.md) for
local setup, and [CLAUDE.md](../CLAUDE.md) + [docs/agents/](../docs/agents/)
for architecture and per-agent design.

Run locally:
```bash
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
