from fastapi import APIRouter, HTTPException

from app.services.analysis_service import AnalysisService
from app.schemas.analysis import MastersAnalysisResponse

router = APIRouter(prefix="/analysis", tags=["analysis"])
service = AnalysisService()


@router.get("/masters/{ticker}", response_model=MastersAnalysisResponse)
async def get_masters_analysis(ticker: str):
    """5대 투자 대가(버핏·린치·그레이엄·드러켄밀러·코스톨라니) 종합 분석."""
    result = await service.get_masters_analysis(ticker)
    if not result:
        raise HTTPException(status_code=404, detail=f"분석 데이터를 찾을 수 없습니다: {ticker}")
    return result
