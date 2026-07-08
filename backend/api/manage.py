from fastapi import APIRouter, Request
from fastapi import File, UploadFile, Form, HTTPException
import shutil
import os
import uuid
import psycopg2
from psycopg2.extras import RealDictCursor
from settings import Settings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from services.manage_service import get_chat_response, generate_embeddings, index_main
from dotenv import load_dotenv
from llama_parse import LlamaParse

load_dotenv()


router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)


@router.post("/upload-report")
async def upload_report(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    name: str = Form(...),
    description: str = Form(...),
    type: str = Form(...)
):
    try:
        stored_filename = f"{uuid.uuid4()}_{file.filename}"
        file_path = os.path.join(UPLOAD_DIR, stored_filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        chunks_upserted = await process_pdf_with_llama_parse(file_path, user_id, name)
        if chunks_upserted:
            conn = psycopg2.connect(Settings.DATABASE_URL, cursor_factory=RealDictCursor)
            cursor = conn.cursor()

            file_details = {
                "filename": file.filename,
                "content_type": file.content_type,
                "size": os.path.getsize(file_path),
                "user_id": user_id,
                "name": name,
                "description": description,
                "type": type,
            }

            query = """
            INSERT INTO medical_recs(user_id, type, name, description)
            VALUES (%s, %s, %s, %s) RETURNING id;
            """
            cursor.execute(query, (user_id, type, name, description))
            conn.commit()
            cursor.close()
            conn.close()

            return {"status": "success", "file_details": file_details, "chunks_upserted": chunks_upserted}
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


# Helper Functions


def chunk_and_upsert(text: str, user_id: str, report_name: str) -> int:
    chunks = text_splitter.split_text(text)
    print(f"Split report into {len(chunks)} chunks")

    vectors = []
    for i, chunk in enumerate(chunks):
        embedding = generate_embeddings(chunk)
        vectors.append(
            {
                "id": str(uuid.uuid4()),
                "values": embedding,
                "metadata": {
                    "user_id": user_id,
                    "report_name": report_name,
                    "chunk_index": i,
                    "text": chunk,
                },
            }
        )

    if vectors:
        index_main.upsert(vectors=vectors, namespace="medical_reports")
        print(f"Upserted {len(vectors)} chunks for user {user_id}")

    return len(vectors)


async def process_pdf_with_llama_parse(pdf_path: str, user_id: str, report_name: str) -> int:
    try:
        print(f"Processing PDF: {pdf_path}")
        parser = LlamaParse(
            result_type="markdown",
            user_prompt="""
            This is a medical report. Extract all the relevant information regarding the patient, tests results, test metadata like date of tests, test name, patient name, test time, etc. Keep it short as possible while covering all test results.
    """,
        )
        documents = await parser.aload_data(pdf_path)
        combined_text = ""
        for i, doc in enumerate(documents):
            numbered_text = f"Document {i + 1}: {doc.text}"
            combined_text += numbered_text + "\n\n"
        print("Parsed PDF text")
    except Exception as e:
        print(f"Error in process_pdf_with_llama_parse: {str(e)}")
        return 0

    return chunk_and_upsert(combined_text, user_id, report_name)
