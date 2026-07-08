from pydantic import BaseModel
from typing import List, Dict


class AddMedicalRecord(BaseModel):
    user_id: str  # Assuming authentication is handled separately
    type: str  # "medicine" or "report"
    name: str
    description: str

class DelMedicalRecord(BaseModel):
    user_id: str 
    id : int 
    type: str  
    name: str
    description: str


class BookingRequest(BaseModel):
    provider_name: str
    provider_contact: str
    patient_name: str
    patient_email: str
    appointment_datetime: str  # ISO 8601, e.g. "2026-07-10T14:30:00"
    notes: str = ""

class HistoryItem(BaseModel):
    query: str
    response: str

class ConsultationRequest(BaseModel):
    question: str
    history: List[HistoryItem]
