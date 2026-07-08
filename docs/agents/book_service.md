# Doctor Search + Booking Agent

**Page**: `/book` ([frontend/src/app/book/page.tsx](../../frontend/src/app/book/page.tsx))
— a tabbed page (Clinics | Doctors), merged from the formerly-separate
`/search` and `/book` pages on 2026-07-07 since they were near-identical
fetch-and-render flows.
**Router**: [backend/api/book.py](../../backend/api/book.py) — `GET /api/get-doctors`, `POST /api/add-to-calendar`
**Services**: [backend/services/book_service.py](../../backend/services/book_service.py) (doctor search agent),
[backend/services/booking_service.py](../../backend/services/booking_service.py) (calendar/email, not an agent)

Clinic search itself lives in [backend/services/clinic_service.py](../../backend/services/clinic_service.py)
/ `GET /api/get-clinics` — see [clinic_service.md](clinic_service.md). This
doc covers the doctor-search agent and the booking/reminder flow, both
reachable from the same `/book` page.

## What it does

Three concerns live behind this one page:
1. **Clinic search** (agentic) — see [clinic_service.md](clinic_service.md).
2. **Doctor search** (agentic) — a LangGraph `StateGraph`, migrated from
   CrewAI on 2026-07-06 alongside clinic search (same pattern, same design
   pivot mid-migration — read `clinic_service.md` for the full story of why
   raw lat/lng in a text search query doesn't work and caused LLM
   hallucination, and why the fix was switching to Serper's `/maps`
   endpoint).
3. **"Add to Calendar" reminder** (non-agentic) — replaces the old Twilio
   voice-call flow entirely as of 2026-07-07. Generates an `.ics` calendar
   invite and emails it to the user via SMTP.

## Doctor search agent (LangGraph)

Same 3-node shape as [clinic_service.py](../../backend/services/clinic_service.py):
`search_places → check_places → (retry search with wider zoom, or) write_descriptions`.

- **`search_places`**: `POST https://google.serper.dev/maps` with
  `q="doctors dentists pediatricians dermatologists gynecologists"` and
  `ll=@{lat},{lng},{zoom}z`. Returns real place listings — in practice these
  are often named practitioners (e.g. `"Julia Graves, MD"`) as well as
  practices/clinics, since that's what Google Maps actually indexes for this
  query; this is a reasonable proxy for "find a doctor," same as the
  original CrewAI version's approximation.
- **`check_places`**: passes if `len(places) >= 4`.
- **`write_descriptions`**: LLM (`gpt-3.5-turbo`, structured output) writes
  one grounded one-line description per place from real rating/category
  facts only — never invents `name`/`workplace`/`contact`. Output keys are
  lowercase (`name`, `workplace`, `contact`, `description`) to match the
  existing frontend contract.
- `contact` comes from Maps' `phoneNumber` field when present, else the
  literal string `"Not listed"` — real Maps listings frequently lack a phone
  number, and rejecting those entries in `check_places`/validation would
  throw away otherwise-good results for no good reason.

## "Add to Calendar" flow (replaces Twilio, 2026-07-07)

**Why Twilio was removed, not fixed**: a static code review (2026-07-06, no
calls placed) found the voice-booking flow fundamentally non-functional, not
just rough:
- The call target was hardcoded (`+13522569034`) — `doctor_name`,
  `doctor_contact`, `patient_name`, `patient_phone` were all extracted from
  the request but **never used**.
- `patient_phone` was poisoned upstream anyway — the frontend sent the
  user's *email* in that field, since no phone number is collected anywhere
  in the app.
- No appointment date/time was ever collected or referenced, by any part of
  the flow.
- The callback URL was a dead ngrok tunnel; TwiML actions were relative and
  only worked while that tunnel was alive.
- Nothing was persisted; the "didn't receive input" branch could loop
  forever.

Since doctor/clinic contact info comes from scraped Google Maps data, there
was never a real booking-system integration to fix here anyway — the honest
capability is a **personal reminder**, not a confirmed booking with the
clinic. That's what replaced it:

- **`build_ics(request: BookingRequest) -> str`** ([booking_service.py](../../backend/services/booking_service.py)) —
  hand-rolled RFC 5545 `VCALENDAR`/`VEVENT` text (no new dependency), `\r\n`
  line endings, 30-minute default duration
  (`APPOINTMENT_DURATION_MINUTES`). Text fields (`SUMMARY`, `DESCRIPTION`,
  `LOCATION`) are escaped via `_escape_ics_text` (backslash/comma/semicolon/
  newline) since real addresses routinely contain commas that would
  otherwise produce a malformed `.ics` for strict calendar parsers.
  `DESCRIPTION` explicitly states the reminder does not book the appointment
  and to call ahead to confirm — the UI copy ("Add to Calendar", not "Book
  Appointment") reinforces the same honesty.
- **`send_confirmation_email(request, ics_content)`** — plain `smtplib` +
  `email.mime` (standard library only), STARTTLS, attaches the `.ics` as a
  `text/calendar` attachment. Credentials come from `Settings.SMTP_*`
  (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`) —
  Gmail SMTP + an app password, configured in `backend/.env`. **Verified
  end-to-end 2026-07-07**: real request through the live `POST
  /api/add-to-calendar` endpoint, email delivered with a valid `.ics`
  attachment.
- **`BookingRequest`** (`models.py`) replaced `AppointmentBooking`/
  `PatientDetails`: flat fields `provider_name`, `provider_contact`,
  `patient_name`, `patient_email`, `appointment_datetime` (ISO 8601 string),
  `notes`. `patient_name`/`patient_email` come from the already-authenticated
  Supabase user on the frontend, not re-collected.
- Router: `POST /api/add-to-calendar` (renamed from `/book-appointment` to
  match the honest framing) — calls `build_ics` then
  `send_confirmation_email`, returns `{"status": "success", "message": ...}`
  or an error string on failure.
- The Twilio IVR webhooks (`/handle-booking-call`, `/process-confirmation`
  in `main.py`) were deleted outright, along with the `twilio` dependency in
  `requirements.txt`.
- **Frontend**: both clinic and doctor cards on `/book` now have an "Add to
  Calendar" button (previously only doctor cards had a booking button at
  all) that opens a `Dialog` collecting date, time, and optional notes, then
  POSTs to `/api/add-to-calendar`.

## Output contract (doctor search)

Router:
```python
@router.get("/get-doctors")
async def get__doctor_search(lat: float = Query(...), lng: float = Query(...)):
    return {"status": "success", "doctors": get_doctors(lat, lng)}
```
`get_doctors` returns a plain `list[dict]` directly — no more
`json.loads(str(result))`. Frontend contract unchanged.

## Known rough edges

- Doctor search: same caching/error-handling gaps as clinic search (see
  [clinic_service.md](clinic_service.md)).
- No persistence of sent reminders (same gap the old Twilio flow had) — if
  you need a history of what reminders were sent, that's not implemented.
- No validation that `appointment_datetime` is in the future, or of
  date/time input format beyond what the native HTML date/time inputs
  enforce client-side.
