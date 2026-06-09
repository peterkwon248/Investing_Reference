from fastapi import APIRouter, HTTPException
from datetime import datetime
from app.services.stock_service import StockService
from app.schemas.stock import StockPrice, ExchangeRateResponse, StockSearchResult

router = APIRouter(prefix="/stocks", tags=["stocks"])
service = StockService()


@router.get("/exchange-rate", response_model=ExchangeRateResponse)
async def get_exchange_rate():
    rate = await service.get_exchange_rate()
    return ExchangeRateResponse(
        rate=rate,
        currency_pair="USD/KRW",
        timestamp=datetime.now()
    )


@router.get("/search")
async def search_stocks(q: str):
    results = await service.search(q)
    return results


@router.get("/{ticker}")
async def get_stock(ticker: str):
    result = await service.get_price(ticker)
    if not result:
        raise HTTPException(status_code=404, detail=f"Stock {ticker} not found")
    return result


@router.get("/{ticker}/history")
async def get_stock_history(ticker: str, period: str = "1y", interval: str = "1d"):
    result = await service.get_history(ticker, period, interval)
    if not result:
        raise HTTPException(status_code=404, detail=f"No history for {ticker}")
    return result
