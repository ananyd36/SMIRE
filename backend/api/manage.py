from fastapi import APIRouter, Query, Request
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
from pinecone import Pinecone, ServerlessSpec
from services.manage_service import get_chat_response




router = APIRouter()

UPLOAD_DIR = "uploads"  
os.makedirs(UPLOAD_DIR, exist_ok=True)  


# Initialize Pinecone
api_key = os.getenv('PINECONE_API_KEY')
pc = Pinecone(api_key=api_key)
cloud = os.environ.get('PINECONE_CLOUD') or 'aws'
region = os.environ.get('PINECONE_REGION') or 'us-east-1'
spec = ServerlessSpec(cloud=cloud, region=region)

index_name = 'smire'
if index_name not in pc.list_indexes().names():
    pc.create_index(index_name, dimension=2048, metric='cosine', spec=spec)
index_main = pc.Index(index_name)

def generate_embeddings(text):
    try:
        client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

        result = client.models.embed_content(
                model="text-embedding-004",
                contents=text,
                config=types.EmbedContentConfig(task_type="SEMANTIC_SIMILARITY")
)
        embeddings = [embedding.values for embedding in result.embeddings]

        # If input is a single text, return first list of embeddings
        return embeddings[0] if len(embeddings) == 1 else embeddings
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating embeddings: {e}")



def parse_structure_gemini(text):
    client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
    model = "gemini-2.0-flash"

    prompt = f"""You are an expert in parsing medical report data. You are given this text: {text}. 
Your job is to summarize all the relevant information regarding the patient, tests results, test metadata like date of tests,etc. Keep it short as possible while covering all test results"""

    contents = [
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=prompt)],
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
        raise HTTPException(status_code=500, detail=f"Error processing with Gemini: {e}")



def structure_text_with_lm(text):
    try:
        print("Structuring text with LM...")
        structured_text = parse_structure_gemini(text)
        print(f"Structured text: {structured_text}")
        
        print("Generating embeddings...")
        embeddings = generate_embeddings(structured_text)
        print(f"Embeddings generated: {embeddings[:5]}")  # Log a snippet of embeddings
        
        vector_id = str(hash(structured_text))
        vector_data = [{
            "id": vector_id,
            "values": embeddings,
            "metadata": {
                "text" : structured_text
                }
        }]
        print(f"Upserting to Pinecone with vector ID: {vector_id}")
        index_main.upsert(
            vectors=vector_data,
            namespace="medical_reports"
        )
        return f"Upserted data with ID {vector_id} into Pinecone"
    except Exception as e:
        print(f"Error in structure_text_with_lm: {e}")
        raise HTTPException(status_code=500, detail=f"Error structuring text: {str(e)}")


def process_pdf_with_tesseract_and_lm(pdf_path):
    print(f"Entered in function")
    try:
        images = convert_from_path(pdf_path, dpi=300)
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
        
        if process_pdf_with_tesseract_and_lm(file_path):
            conn = psycopg2.connect(Settings.DATABASE_URL, cursor_factory=RealDictCursor)
            cursor = conn.cursor()
            
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
    


@router.post("/get-insights")
async def get_insights(request: Request):    
    try:    
        request_body = await request.json()
        user_id = request_body.get("user_id")
        query = request_body.get("query")
        response = get_chat_response(user_id, query)
        return {"status": "success", "response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")