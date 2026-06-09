"""슈퍼차트 서비스

v5 render_chart_analysis_mode(app.py line 28763)의 의도를 이식:
- 1년 OHLCV 캔들
- 기술적 지표(MA/RSI/MACD/거래량) 계산 + 종합 점수 기반 매수/관망/매도 판정
- 차트 오버레이용 MA20/60/120 라인 + RSI + MACD 히스토그램

indicators.calc_all_indicators / analyze_all 와 yfinance_client.get_analysis_data 재사용.
블로킹(yfinance, pandas)은 asyncio.to_thread 로 오프로드.
"""

import asyncio
import math
from typing import Optional, Dict, List

import pandas as pd

from app.data.yfinance_client import get_analysis_data
from app.core.indicators import calc_all_indicators, analyze_all


def _safe_float(value, default: float = 0.0) -> float:
    """NaN/Inf 를 JSON 안전한 값으로 변환."""
    try:
        f = float(value)
    except (TypeError, ValueError):
        return default
    if math.isnan(f) or math.isinf(f):
        return default
    return f


def _build_payload(ticker: str, data: Dict) -> Optional[Dict]:
    """블로킹 계산 본체 (asyncio.to_thread 에서 실행)."""
    hist: pd.DataFrame = data["hist"]
    info: Dict = data.get("info") or {}

    if hist is None or hist.empty:
        return None

    # 시간대 제거 (인덱스가 tz-aware 일 수 있음)
    df = hist.copy()
    if isinstance(df.index, pd.DatetimeIndex) and df.index.tz is not None:
        df.index = df.index.tz_localize(None)

    # 지표 계산 + 종합 분석
    df = calc_all_indicators(df)
    analysis = analyze_all(df)

    # 현재가 / 전일 대비
    current = float(df["Close"].iloc[-1])
    prev = float(df["Close"].iloc[-2]) if len(df) > 1 else current
    change = current - prev
    change_percent = (change / prev * 100) if prev > 0 else 0.0

    high_52w = float(df["High"].max()) if "High" in df.columns else None
    low_52w = float(df["Low"].min()) if "Low" in df.columns else None

    # 캔들 데이터
    candles: List[Dict] = []
    for idx, row in df.iterrows():
        candles.append({
            "time": str(idx.date()) if hasattr(idx, "date") else str(idx)[:10],
            "open": round(_safe_float(row["Open"]), 4),
            "high": round(_safe_float(row["High"]), 4),
            "low": round(_safe_float(row["Low"]), 4),
            "close": round(_safe_float(row["Close"]), 4),
            "volume": int(_safe_float(row["Volume"])),
        })

    # 오버레이 라인 빌더 (NaN/선행 null 제거)
    def line(col: str) -> List[Dict]:
        if col not in df.columns:
            return []
        points: List[Dict] = []
        for idx, val in df[col].items():
            if val is None or pd.isna(val):
                continue
            t = str(idx.date()) if hasattr(idx, "date") else str(idx)[:10]
            points.append({"time": t, "value": round(_safe_float(val), 4)})
        return points

    overlays = {
        "ma20": line("MA20"),
        "ma60": line("MA60"),
        "ma120": line("MA120"),
        "rsi": line("RSI"),
        "macd_hist": line("MACD_Hist"),
    }

    # analyze_all dict 정규화 (JSON 안전 + 정수화)
    analysis_out = {
        "total_score": int(_safe_float(analysis.get("total_score"), 50)),
        "ma_status": analysis.get("ma_status", "neutral"),
        "ma_score": int(_safe_float(analysis.get("ma_score"), 0)),
        "rsi": round(_safe_float(analysis.get("rsi"), 50.0), 2),
        "rsi_status": analysis.get("rsi_status", "neutral"),
        "rsi_score": int(_safe_float(analysis.get("rsi_score"), 0)),
        "macd_status": analysis.get("macd_status", "neutral"),
        "macd_score": int(_safe_float(analysis.get("macd_score"), 0)),
        "vol_ratio": round(_safe_float(analysis.get("vol_ratio"), 1.0), 3),
        "vol_status": analysis.get("vol_status", "neutral"),
        "vol_score": int(_safe_float(analysis.get("vol_score"), 0)),
        "acc_ratio": round(_safe_float(analysis.get("acc_ratio"), 1.0), 3),
        "acc_status": analysis.get("acc_status", "neutral"),
        "price_change": round(_safe_float(analysis.get("price_change"), 0.0), 3),
        "supports": [round(_safe_float(s), 4) for s in analysis.get("supports", [])],
        "resistances": [round(_safe_float(r), 4) for r in analysis.get("resistances", [])],
    }

    return {
        "ticker": ticker,
        "name": info.get("shortName") or info.get("longName") or ticker,
        "current_price": round(current, 4),
        "change": round(change, 4),
        "change_percent": round(change_percent, 4),
        "period": "1y",
        "high_52w": round(high_52w, 4) if high_52w is not None else None,
        "low_52w": round(low_52w, 4) if low_52w is not None else None,
        "analysis": analysis_out,
        "candles": candles,
        "overlays": overlays,
    }


class ChartService:
    """슈퍼차트 데이터 + 기술적 분석 서비스."""

    async def get_chart(self, ticker: str, period: str = "1y") -> Optional[Dict]:
        ticker = ticker.upper().strip()

        # get_analysis_data 는 항상 1년 이력을 가져온다 (REUSE, 수정 금지)
        data = await asyncio.to_thread(get_analysis_data, ticker)
        if not data:
            return None

        payload = await asyncio.to_thread(_build_payload, ticker, data)
        return payload
