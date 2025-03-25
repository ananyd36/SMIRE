from fastapi import APIRouter, Query, HTTPException
import json
from services.book_service import get_doctors
from twilio.rest import Client
from models import AppointmentBooking
import os 
from dotenv import load_dotenv
load_dotenv()



router = APIRouter()

@router.get("/get-doctors")
async def get__doctor_search(lat: float = Query(...), lng: float = Query(...)):
    result = get_doctors(lat, lng)
    result_str = str(result) if not isinstance(result, str) else result
    return {"status": "success", "doctors": json.loads(result_str)}




@router.post("/book-appointment")
async def book_appointment(appointment_data: AppointmentBooking):
    try:
        doctor_name = appointment_data.doctor_name
        doctor_contact = appointment_data.doctor_contact
        patient_name = appointment_data.patient_details.name
        patient_phone = appointment_data.patient_details.phone

        # Twilio configuration
        twilio_account_sid = os.getenv('TWILIO_ACCOUNT_SID')
        twilio_auth_token = os.getenv('TWILIO_AUTH_TOKEN')
        twilio_phone_number = os.getenv('TWILIO_PHONE_NUMBER')
        
        # Initialize Twilio client
        client = Client(twilio_account_sid, twilio_auth_token)
        
        # Make call to doctor's number
        call = client.calls.create(
            to='+13522569034',
            from_=twilio_phone_number,
            url='https://32ce-2600-8807-c184-7500-a16b-f104-da98-39ce.ngrok-free.app/handle-booking-call',  
        )
        
        # booking_details = {
        #     'doctor_name': doctor_name,
        #     'doctor_contact': doctor_contact,
        #     'patient_details': patient_details,
        #     'call_sid': call.sid,
        #     'status': 'initiated'
        # }
        
        # Save to database (implement your own database saving logic)
        # save_booking_to_database(booking_details)
        
        return {
            "status": "success", 
            "message": "Appointment booking initiated",
            "call_sid": call.sid
        }
    
    except Exception as e:
        print(f"Error occurred: {e}")
        return {
            "status": "error",
            "message": f"An error occurred: {str(e)}"
        }
    


    