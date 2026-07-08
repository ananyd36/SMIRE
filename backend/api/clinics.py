from fastapi import APIRouter, Query
from services.clinic_service import get_nearby_clinics

router = APIRouter()

@router.get("/get-clinics")
async def get__clinics_search(lat: float = Query(...), lng: float = Query(...)):
    return {"status": "success", "clinics": get_nearby_clinics(lat, lng)}
