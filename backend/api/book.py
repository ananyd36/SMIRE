from fastapi import APIRouter, Query
import json
from services.book_service import get_doctors

router = APIRouter()

@router.get("/get-doctors")
async def get__doctor_search(lat: float = Query(...), lng: float = Query(...)):
    result = get_doctors(lat, lng)
    result_str = str(result) if not isinstance(result, str) else result
    return {"status": "success", "doctors": json.loads(result_str)}
