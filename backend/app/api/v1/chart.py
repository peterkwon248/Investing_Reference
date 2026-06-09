from fastapi import APIRouter, HTTPException

from app.services.chart_service import ChartService
from app.schemas.chart import ChartResponse

router = APIRouter(prefix="/analysis", tags=["chart"])
service = ChartService()


@router.get("/chart/{ticker}", response_model=ChartResponse)
async def get_chart(ticker: str, period: str = "1y"):
    """슈퍼차트: 1년 OHLCV 캔들 + 기술적 지표 종합 분석 + 차트 오버레이."""
    result = await service.get_chart(ticker, period)
    if not result:
        raise HTTPException(status_code=404, detail=f"차트 데이터를 찾을 수 없습니다: {ticker}")
    return result
