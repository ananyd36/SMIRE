from fastapi import APIRouter
from services.news_service import get_medical_news

router = APIRouter()

@router.get("/get-news")
async def get_news():
    return {"status": "success", "articles": get_medical_news()}
