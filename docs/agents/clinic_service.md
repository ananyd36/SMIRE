# Clinic Search Agent

**Page**: `/book` ([frontend/src/app/book/page.tsx](../../frontend/src/app/book/page.tsx)),
"Clinics" tab — merged into the `/book` page on 2026-07-07 (was previously
its own `/search` page; merged since clinic and doctor search were
near-identical fetch-and-render flows). See [book_service.md](book_service.md)
for the doctor-search half and the "Add to Calendar" reminder flow shared by
both tabs.
**Router**: `GET /api/get-clinics` ([backend/api/clinics.py](../../backend/api/clinics.py))
**Service**: [backend/services/clinic_service.py](../../backend/services/clinic_service.py)

## What it does

Given the user's browser geolocation (`lat`, `lng`), finds nearby clinics/
hospitals via true geo-scoped search and returns a structured list for the
frontend to render as cards (name, location, link, description).

**Migrated from CrewAI to LangGraph on 2026-07-06**, alongside
[book_service.md](book_service.md) (doctor search) — same pattern, built
right after news. See [CLAUDE.md](../../CLAUDE.md) for the migration
rationale/checklist.

## Design pivot during migration: Serper `/search` → Serper `/maps`

The first version of this migration kept CrewAI's approach of interpolating
raw `lat`/`lng` floats into a plain-text Serper `/search` query (e.g. `"...
near latitude 37.7749, longitude -122.4194"`). **Testing surfaced a real bug**:
Google/Serper treats that as a literal text search, not a geo query — it
matched unrelated documents that happened to contain those digits (e.g. a
power-plant coordinates spreadsheet) and returned almost no useful results.
The LLM "write" step then **fabricated** plausible-sounding fake clinics
("City Hospital, 123 Main Street, City, State") to fill the gap — and the
validation at the time (checking only that fields were non-empty) didn't
catch it, since fabricated data has non-empty fields too.

Fix: switched the search step to Serper's **`/maps`** endpoint, which accepts
a proper `ll=@lat,lng,zoom` parameter and does real geo-scoped place search,
returning structured data directly (`title`, `address`, `phoneNumber`,
`website`, `rating`, `ratingCount`, `category`). This closes the hallucination
path **structurally**, not just via a stricter check: the LLM never touches
Name/Location/Link, which are now copied verbatim from Maps results. The
LLM's only remaining job is writing a one-line `Description` from real
rating/category facts — a much lower-risk task (elaborating on given facts)
than inventing missing structured fields from a thin/irrelevant context.

## Pattern: 3-node `StateGraph`, retry-by-search (not retry-by-write)

```
search_places → check_places ─┬─ enough places, or 2 attempts used → write_descriptions → END
       ↑ ─────────────────────┘ too few places, attempts < 2 → retry (wider zoom)
```

State (`ClinicState`, a `TypedDict`):
```python
class ClinicState(TypedDict):
    lat: float
    lng: float
    zoom: int          # Google Maps zoom level; lower = wider radius
    places: list[dict]  # raw Serper Maps results (ground truth)
    clinics: list[dict] # final Name/Location/Link/Description dicts
    attempts: int
    valid: bool
```

- **`search_places`** — no LLM. Calls `POST https://google.serper.dev/maps`
  with `q="clinics hospitals doctors"` and `ll=@{lat},{lng},{zoom}z`. On
  retry, zoom is decremented by 3 (min 8) to widen the search radius — this
  is why the retry loop points back to `search_places`, not `write_descriptions`:
  too few results is a data-scarcity problem, not a formatting problem.
- **`check_places`** — no LLM, plain Python: passes if `len(places) >= 4`
  (`MIN_PLACES`).
- **`write_descriptions`** — the only LLM call (`ChatOpenAI`, `gpt-3.5-turbo`,
  `.with_structured_output`). Given up to 6 places (`MAX_DESCRIBE`) as a
  numbered list of `title / category / rating / ratingCount` facts, asks for
  exactly that many one-line descriptions in the same order, explicitly
  instructed not to invent details beyond what's given. `Name`/`Location`/
  `Link` are assembled in code directly from the Maps result, never from the
  LLM. If the model returns fewer descriptions than places (index out of
  range), a deterministic fallback description
  (`f"{category} · {rating}★ ({ratingCount} reviews)"`) is used instead of
  erroring.
- Bounded at `MAX_SEARCH_ATTEMPTS = 2` total search attempts. If still under
  4 places after widening, proceeds to `write_descriptions` with whatever was
  found (including zero) — verified in testing that zero real places produces
  zero fabricated clinics, not hallucinated ones.

## Output contract

Router:
```python
@router.get("/get-clinics")
async def get__clinics_search(lat: float = Query(...), lng: float = Query(...)):
    return {"status": "success", "clinics": get_nearby_clinics(lat, lng)}
```
No more `json.loads(str(result))` — `get_nearby_clinics` returns a plain
`list[dict]` matching the frontend's `{Name, Location, Link, Description}`
contract directly. This contract was unchanged by the migration itself; the
frontend was later restructured (2026-07-07, unrelated to this migration) to
show clinic cards in a "Clinics" tab on `/book` instead of a standalone
`/search` page.

## Known rough edges

- No caching — every page load re-runs the full graph (1-2 Maps calls + 1 LLM
  call) live.
- `search_places` doesn't handle Serper request failures (network error,
  rate limit) — an uncaught exception there will 500 the endpoint.
- `MAX_DESCRIBE = 6` means if Maps returns more than 6 relevant places, only
  the first 6 (by Maps' own ranking) get descriptions/surfaced — acceptable
  today since the frontend only shows a handful of cards anyway.
