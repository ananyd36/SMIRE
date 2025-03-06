from fastapi import APIRouter, Query
import json
from services.clinic_service import get_nearby_clinics

router = APIRouter()

@router.get("/get-clinics")
async def get__clinics_search(lat: float = Query(...), lng: float = Query(...)):
    result = get_nearby_clinics(lat,lng)
    result_str = str(result) if not isinstance(result, str) else result

    return {"status": "success", "clinics": json.loads(result_str)}
