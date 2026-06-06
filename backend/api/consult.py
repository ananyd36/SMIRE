from fastapi import APIRouter, Query
import json
from services.consult_service import get_consultations
from models import ConsultationRequest

router = APIRouter()



@router.post("/get-consultation")
async def get__consultation_search(request: ConsultationRequest):
    question = request.question
    history = request.history

    # Pass the question and history to the service function
    result = get_consultations(question, history)
    return {"status": "success", "answer": str(result)}
