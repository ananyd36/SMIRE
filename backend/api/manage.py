from fastapi import APIRouter, Query
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
import shutil
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from settings import Settings
import torch
from PIL import Image
from pdf2image import convert_from_path
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import pytesseract





router = APIRouter()

UPLOAD_DIR = "uploads"  
os.makedirs(UPLOAD_DIR, exist_ok=True)  

def structure_text_with_lm(text):
    try:
        tokenizer = AutoTokenizer.from_pretrained("google/flan-t5-small") 
        model = AutoModelForSeq2SeqLM.from_pretrained("google/flan-t5-small")

        prompt = f"Structure the following medical text: {text}. Extract key information such as patient name, date, diagnosis, and treatment."
        inputs = tokenizer(prompt, return_tensors="pt", max_length=512, truncation=True)
        with torch.no_grad():
            outputs = model.generate(**inputs, max_length=1024)
        structured_text = tokenizer.decode(outputs[0], skip_special_tokens=True)
        return structured_text
    except Exception as e:
        return f"Error structuring text: {str(e)}"


def process_pdf_with_tesseract_and_lm(pdf_path):
    print(f"Entered in fucntion")
    try:
        images = convert_from_path(pdf_path, dpi=300)  # had to install poppler to get the pdf2image working fine, other wise facing internal server error 500
        print(f"Converted PDF into {len(images)} pages")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error converting PDF: {str(e)}")

    full_text = ""
    for image in images:
        try:
            text = pytesseract.image_to_string(image)
            full_text += text + "\n"
        except Exception as e:
            full_text += f"Error OCRing image: {str(e)}\n"
    print(full_text)
    structured_text = structure_text_with_lm(full_text)
    return structured_text


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
        
        result = process_pdf_with_tesseract_and_lm(file_path)

        print("---------------------")
        print("Result=====", result)
        print("---------------------")

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
