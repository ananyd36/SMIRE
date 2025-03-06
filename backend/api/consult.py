from fastapi import APIRouter, Query
import json
from services.consult_service import get_consultations

router = APIRouter()

@router.get("/get-consultation")
async def get__consultation_search(question: str = Query(...)):
    result = get_consultations(question)
    return {"status": "success", "answer": str(result)}
