from fastapi import APIRouter, Query
from services.book_service import get_doctors
from services.booking_service import build_ics, send_confirmation_email
from models import BookingRequest
from dotenv import load_dotenv
load_dotenv()



router = APIRouter()

@router.get("/get-doctors")
async def get__doctor_search(lat: float = Query(...), lng: float = Query(...)):
    return {"status": "success", "doctors": get_doctors(lat, lng)}


@router.post("/add-to-calendar")
async def add_to_calendar(request: BookingRequest):
    try:
        ics_content = build_ics(request)
        send_confirmation_email(request, ics_content)
        return {"status": "success", "message": "Reminder sent to your email."}
    except Exception as e:
        print(f"Error occurred: {e}")
        return {"status": "error", "message": f"An error occurred: {str(e)}"}
