import json
from fastapi import FastAPI, Query, HTTPException, Response, Request
from fastapi.middleware.cors import CORSMiddleware
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from models import AddMedicalRecord , DelMedicalRecord 
from api import news, clinics, consult, book, manage
from dotenv import load_dotenv
from settings import Settings
from twilio.twiml.voice_response import VoiceResponse, Gather
import requests
from dotenv import load_dotenv




load_dotenv()
app = FastAPI()


openai_api_key = Settings.OPENAI_API_KEY
serper_api_key = Settings.SERPER_API_KEY

os.environ["OPENAI_API_KEY"] = openai_api_key
os.environ["SERPER_API_KEY"] = serper_api_key
os.environ["OPENAI_MODEL_NAME"] = "gpt-3.5-turbo"

origins = [
    "http://localhost:3000",  # Local Next.js frontend
    "http://frontend:3000",   # Docker Compose service name
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods (GET, POST, PUT, DELETE)
    allow_headers=["*"],  # Allow all headers
)


app.include_router(news.router, prefix="/api")
app.include_router(clinics.router, prefix="/api")
app.include_router(consult.router, prefix="/api")
app.include_router(book.router, prefix="/api")
app.include_router(manage.router, prefix="/api")



@app.get("/")
async def root():
    return {"message": "Backend Running"}


@app.post("/add-record")
async def add_record(record: AddMedicalRecord):
    try:
        conn = psycopg2.connect(Settings.DATABASE_URL, cursor_factory=RealDictCursor)
        cursor = conn.cursor()
        query = "INSERT INTO medical_recs(user_id, type, name, description) VALUES (%s, %s, %s, %s) RETURNING id;"
        cursor.execute(query, (record.user_id, record.type, record.name, record.description))
        conn.commit()
        return {"status": "success", "message": "Record added successfully!"}
    except Exception as e:
        print("ERROR: ", str(e))
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/get-records/{user_id}")
async def get_records(user_id: str, type: str):
    try:
        conn = psycopg2.connect(Settings.DATABASE_URL, cursor_factory=RealDictCursor)
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM medical_recs WHERE user_id = %s and type = %s ;", (user_id,type))
        records = cursor.fetchall()
        return {"status": "success", "records": records}
    except Exception as e:
        conn.rollback()
        return {"status": "error", "message": str(e)}
    finally:
        conn.close()
        cursor.close()

@app.post("/delete-record")
async def delete_record(request : DelMedicalRecord):
    try:
        conn = psycopg2.connect(Settings.DATABASE_URL, cursor_factory=RealDictCursor)
        cursor = conn.cursor()
        cursor.execute("Delete from medical_recs where user_id = %s and id = %s and type = %s and name = %s and description = %s;", (request.user_id, request.id, request.type, request.name, request.description))
        conn.commit()
        return {"status": "success"}
    except Exception as e:
        conn.rollback()
        return {"status": "error", "message": str(e)}
    finally:
        conn.close()
        cursor.close()



@app.post('/handle-booking-call')
async def handle_booking_call(request: Request):
    form_data = await request.form()
    print(form_data)  
    
    response = VoiceResponse()

    with response.gather(
        numDigits=1,
        action='/process-confirmation',  
        method='POST'  
    ) as gather:
        gather.say("Hello, we are calling to confirm an appointment. Press 1 to confirm, 2 to reschedule.")

    response.say("Sorry, we didn't receive your input.")
    response.redirect('/handle-booking-call')

    return Response(str(response), media_type='application/xml')


@app.post('/process-confirmation')
async def process_confirmation(request: Request):
    form_data = await request.form()
    digit_pressed = form_data.get('Digits')  #

    if digit_pressed == '1':
        print("User Pressed 1 - Appointment Confirmed")
    elif digit_pressed == '2':
        print("User Pressed 2 - Rescheduling")

    response = VoiceResponse()
    response.say("Thank you for your response. Goodbye.")
    response.hangup()

    return Response(str(response), media_type='application/xml')

