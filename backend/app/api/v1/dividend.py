from fastapi import APIRouter, HTTPException

from app.services.dividend_service import DividendService
from app.schemas.dividend import DividendResponse

router = APIRouter(prefix="/analysis", tags=["dividend"])
service = DividendService()


@router.get("/dividend/{ticker}", response_model=DividendResponse)
async def get_dividend(ticker: str):
    """슈퍼배당: 배당수익률 / 연간배당금 / 배당성향 / 연속 증가·지급 연수 /
    CAGR / 연도별 배당 history 등 배당 전문 분석.

    배당을 지급하지 않거나 데이터가 없으면 404.
    """
    result = await service.get_dividends(ticker)
    if not result:
        raise HTTPException(
            status_code=404,
            detail=f"배당 데이터를 찾을 수 없습니다: {ticker} (배당을 지급하지 않는 종목일 수 있습니다)",
        )
    return result
