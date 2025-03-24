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
from google import genai
from google.genai import types
import pinecone
import openai





router = APIRouter()

UPLOAD_DIR = "uploads"  
os.makedirs(UPLOAD_DIR, exist_ok=True)  

pinecone.init(api_key=os.environ.get("PINECONE_API_KEY"), environment="us-east-1")


def upsert_to_pinecone(text, embeddings, namespace="medical_reports"):
    try:
        index = pinecone.Index("smire")  
        vector_id = str(hash(text))  
        
        index.upsert(
            vectors=[(vector_id, embeddings)],
            namespace=namespace
        )
        return f"Upserted data with ID {vector_id} into Pinecone"
    except Exception as e:
        return f"Error upserting to Pinecone: {e}"



def generate_embeddings(text):
    try:
        response = openai.Embedding.create(
            model="text-embedding-ada-002", 
            input=text
        )
        embeddings = response['data'][0]['embedding']
        return embeddings
    except Exception as e:
        return f"Error generating embeddings: {e}"
    



def parse_structure_gemini(text):
    client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

    model = "gemini-2.0-flash"

    prompt = f"""You are an expert in parsing medical report data. You are given this text: {text}. 
Your job is to summarize all the relevant information regarding the patient, tests results, test metadata like date of tests,etc. Keep it short as possible while covering all test results"""

    contents = [
        types.Content(
            role="user",
            parts=[
                types.Part.from_text(text=prompt),
            ],
        ),
    ]

    generate_content_config = types.GenerateContentConfig(
        temperature=0,
        top_p=1,
        top_k=1,
        max_output_tokens=len(text),
        response_mime_type="text/plain",
    )

    try:
        response = client.models.generate_content(
            model=model,
            contents=contents,
            config=generate_content_config,
        )
        return response.candidates[0].content.parts[0].text.strip()

    except Exception as e:
        return f"Error processing with Gemini: {e}"
    


def structure_text_with_lm(text):
    try:
        structured_text = parse_structure_gemini(text)
        embeddings = generate_embeddings(structured_text)
        result = upsert_to_pinecone(structured_text, embeddings)
        print(result)
        return True
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
    return structure_text_with_lm(full_text)


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
        
        if(process_pdf_with_tesseract_and_lm(file_path)):

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

            query = """
            INSERT INTO medical_recs(user_id, type, name, description)
            VALUES (%s, %s, %s, %s) RETURNING id;
            """
            cursor.execute(query, (user_id, type, name, description))
            conn.commit()

            return {"status": "success", "file_details": file_details}
        else:
            return {"status": "failure"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")
