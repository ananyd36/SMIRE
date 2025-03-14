import json
from fastapi import FastAPI, Query, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
import os
from crewai import Crew, Task, Agent, Process
from crewai_tools import ScrapeWebsiteTool, SerperDevTool
import psycopg2
from psycopg2.extras import RealDictCursor
from models import MedicalRecord
from api import news,clinics, consult, book, manage
from dotenv import load_dotenv
from settings import Settings


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
    allow_origins=origins,
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
async def add_record(record: MedicalRecord):
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
async def get_records(user_id: str):
    conn = psycopg2.connect(Settings.DATABASE_URL, cursor_factory=RealDictCursor)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM medical_recs WHERE user_id = %s ;", (user_id,))
    records = cursor.fetchall()
    return {"status": "success", "records": records}

