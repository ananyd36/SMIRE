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


class PatientDetails(BaseModel):
    name: str
    phone: str

class AppointmentBooking(BaseModel):
    doctor_name: str
    doctor_contact: str
    patient_details: PatientDetails

class HistoryItem(BaseModel):
    query: str
    response: str

class ConsultationRequest(BaseModel):
    question: str
    history: List[HistoryItem]
