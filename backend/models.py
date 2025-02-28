from pydantic import BaseModel


class MedicalRecord(BaseModel):
    user_id: str  # Assuming authentication is handled separately
    type: str  # "medicine" or "report"
    name: str
    description: str