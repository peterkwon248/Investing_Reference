from pydantic import BaseModel
from typing import Dict, List


class IndicatorSignal(BaseModel):
    """v5 signals 항목 (지표별 해석 한 줄)."""

    emoji: str       # 🟢 / 🟡 / 🟠 / 🔴
    name: str        # VIX, S&P500, 성장주, 금, 채권(TLT) ...
    value: str       # "18.3", "+4.2% (1개월)", "₩1,380" ...
    status: str      # "정상 범위", "강한 상승 추세" ...
    advice: str      # 💡 추천 문구


class MarketStatus(BaseModel):
    """overall_score → 시장 상태 판정."""

    status: str       # "🟢 강세장" 등
    color_key: str    # strong_bull / bull / neutral / bear / strong_bear
    color_hex: str    # v5 원본 HEX (참고용)
    why: str          # WHY 설명 문단
    action: str       # 추천 행동 한 줄


class IndicatorSnapshot(BaseModel):
    """지표별 수치 스냅샷."""

    current: float
    change_1d: float
    change_1m: float
    high_1m: float
    low_1m: float


class StrategyBlock(BaseModel):
    """전략 제안 블록."""

    tone: str          # success / info / warning / error
    title: str
    points: List[str]


class MacroResponse(BaseModel):
    overall_score: int                       # -100 ~ +100
    market_status: MarketStatus
    signals: List[IndicatorSignal]
    strategy: StrategyBlock
    indicators: Dict[str, IndicatorSnapshot]
    as_of: str                               # YYYY-MM-DD HH:MM
    disclaimer: str
