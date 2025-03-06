from fastapi import APIRouter
import json
from services.news_service import get_medical_news

router = APIRouter()

@router.get("/get-news")
async def get_news():
    result = get_medical_news()
    result_str = str(result) if not isinstance(result, str) else result

    return {"status": "success", "articles": json.loads(result_str)}
