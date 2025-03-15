from urllib import request
from fastapi import APIRouter, Query
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from typing import Optional
import shutil
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from settings import Settings



router = APIRouter()

UPLOAD_DIR = "uploads"  
os.makedirs(UPLOAD_DIR, exist_ok=True)  


@router.post("/upload-report")
async def upload_report(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    name: str = Form(...),
    description: str = Form(...),
    type: str = Form(...)
):    

    try:
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        conn = psycopg2.connect(Settings.DATABASE_URL, cursor_factory=RealDictCursor)
        cursor = conn.cursor()
        
        # Extract file details
        file_details = {
            "filename": file.filename,
            "content_type": file.content_type,
            "size": os.path.getsize(file_path),  
            "user_id": user_id,
            "name": name,
            "description": description,
            "type": type
        }
        
        '''Outline for next steps

            1. Use Deepseek vision models to perform OCR and create the file into a much structured and parseable manner 
            2. The use those the converted document and chunk them using anthropic onctextual retrieval technique plus BM 25 like other metadata creation.
            3. Store them in pinecone vector DB or search for more optimized workflow.
            4. For retrieval, use techniques like reranking/use different similarity searches.
            5. Display the output back into the UI

        '''

        query = """
        INSERT INTO medical_recs(user_id, type, name, description)
        VALUES (%s, %s, %s, %s) RETURNING id;
        """
        cursor.execute(query, (user_id, type, name, description))
        conn.commit()



        return {"status": "success", "file_details": file_details}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")
