from pydantic import BaseModel
from typing import List, Optional


class DividendHistoryPoint(BaseModel):
    """연도별 배당 합계 (차트 + 성장률 테이블용)."""

    year: int
    amount: float
    growth: Optional[float] = None  # 전년 대비 성장률 (%)


class DividendResponse(BaseModel):
    ticker: str
    name: str
    currency: str  # "USD" | "KRW" 등

    current_price: float
    dividend_yield: float          # 배당수익률 (%)
    annual_dividend: float         # 연간배당금 (최근 12개월 합, 1주당)
    payout_ratio: float            # 배당성향 (%)
    five_year_avg_yield: Optional[float] = None  # 5년 평균 배당수익률 (%)
    ex_dividend_date: Optional[str] = None        # 배당락일 (YYYY-MM-DD)
    frequency: str                 # 배당 주기 라벨 (월/분기/반기/연배당)

    dividend_growth: Optional[float] = None       # 연간배당 YoY 증가율 (%)
    consecutive_increase_years: int               # 연속 증가 연수
    consecutive_payment_years: int                # 연속 지급 연수

    grade: str                     # 배당 등급 라벨 (배당왕 등)
    grade_key: str                 # king | aristocrat | achiever | grower | payer | normal
    grade_desc: str                # 등급 설명

    cagr_3y: Optional[float] = None
    cagr_5y: Optional[float] = None
    cagr_10y: Optional[float] = None

    avg_dividend: float            # 연평균 배당금 (1주당)
    first_dividend_year: int
    total_dividend_years: int

    history: List[DividendHistoryPoint]
