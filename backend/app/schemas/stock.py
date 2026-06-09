from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class StockSearchResult(BaseModel):
    ticker: str
    name: str
    market: str
    exchange: Optional[str] = None


class StockPrice(BaseModel):
    ticker: str
    name: Optional[str] = None
    price: float
    change: float
    change_percent: float
    volume: Optional[int] = None
    market_cap: Optional[float] = None
    currency: str = "USD"


class ExchangeRateResponse(BaseModel):
    rate: float
    currency_pair: str = "USD/KRW"
    timestamp: datetime


class StockHistoryRequest(BaseModel):
    ticker: str
    period: str = "1y"
    interval: str = "1d"


class StockHistoryPoint(BaseModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int
