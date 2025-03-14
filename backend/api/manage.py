from urllib import request
from fastapi import APIRouter, Query
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from typing import Optional
import shutil
import os


router = APIRouter()

UPLOAD_DIR = "uploads"  # Directory to store uploaded files
os.makedirs(UPLOAD_DIR, exist_ok=True)  # Create the directory if not exists


@router.post("/upload-report")
async def upload_report(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    name: str = Form(...),
    description: str = Form(...),
    type: str = Form(...)
):    

    try:
        # Define the file path
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        
        # Save the uploaded file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Extract file details
        file_details = {
            "filename": file.filename,
            "content_type": file.content_type,
            "size": os.path.getsize(file_path),  # Get file size in bytes
            "user_id": user_id,
            "name": name,
            "description": description,
            "type": type
        }

        print(file_details)
        return {"status": "success", "file_details": file_details}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")
