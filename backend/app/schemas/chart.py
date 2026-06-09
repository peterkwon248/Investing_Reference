from pydantic import BaseModel
from typing import List, Optional


class Candle(BaseModel):
    time: str  # YYYY-MM-DD
    open: float
    high: float
    low: float
    close: float
    volume: int


class LinePoint(BaseModel):
    time: str  # YYYY-MM-DD
    value: float


class ChartAnalysis(BaseModel):
    """analyze_all() 결과 dict의 타입 표현."""

    total_score: int

    ma_status: str
    ma_score: int

    rsi: float
    rsi_status: str
    rsi_score: int

    macd_status: str
    macd_score: int

    vol_ratio: float
    vol_status: str
    vol_score: int

    acc_ratio: float
    acc_status: str

    price_change: float  # 전일 대비 % (analyze_all 기준)

    supports: List[float]
    resistances: List[float]


class ChartOverlays(BaseModel):
    ma20: List[LinePoint]
    ma60: List[LinePoint]
    ma120: List[LinePoint]
    rsi: List[LinePoint]
    macd_hist: List[LinePoint]


class ChartResponse(BaseModel):
    ticker: str
    name: str
    current_price: float
    change: float
    change_percent: float
    period: str
    high_52w: Optional[float] = None
    low_52w: Optional[float] = None
    analysis: ChartAnalysis
    candles: List[Candle]
    overlays: ChartOverlays
