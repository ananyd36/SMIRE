from pydantic import BaseModel


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
