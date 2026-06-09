"""슈퍼배당 서비스

v5 render_super_dividend_mode(app.py line 32399) + render_dividend_analysis_tab(line 9410)
의 핵심 배당 지표 로직을 이식:

- 현재가 / 배당수익률(%) / 연간배당금(최근 12개월 합) / 배당성향(payoutRatio)
- 5년 평균 배당수익률 / 배당락일(ex-div)
- 연도별 배당 합계 history (차트용)
- 배당 증가율(연간배당 YoY) / 연속 증가 연수 / 연속 지급 연수
- 3/5/10년 CAGR / 연평균 배당금 / 첫 배당년도
- 배당 등급 판정 (배당왕/배당귀족/배당성취자/배당성장주/배당지급주/일반)

yfinance dividends(Series) + info 는 이 서비스 안에서 직접 fetch 한다
(yfinance_client.py 는 수정하지 않는다). 블로킹(yfinance, pandas)은
asyncio.to_thread 로 오프로드.

배당을 지급하지 않거나 데이터가 없으면 None 을 반환한다.
"""

import asyncio
import math
from datetime import datetime, date
from typing import Optional, Dict, List

import pandas as pd
import yfinance as yf


def _safe_float(value, default: float = 0.0) -> float:
    """NaN/Inf 를 JSON 안전한 값으로 변환."""
    try:
        f = float(value)
    except (TypeError, ValueError):
        return default
    if math.isnan(f) or math.isinf(f):
        return default
    return f


def _is_kr(ticker: str) -> bool:
    """한국 종목(.KS/.KQ) 여부 → 통화/포맷 결정용."""
    t = ticker.upper()
    return t.endswith(".KS") or t.endswith(".KQ")


def _normalize_yield(raw) -> Optional[float]:
    """yfinance dividendYield 정규화.

    yfinance 버전에 따라 0.035(소수) 또는 3.5(퍼센트)로 들어온다.
    1 보다 크면 이미 퍼센트로 간주, 작으면 *100.
    """
    v = _safe_float(raw, 0.0)
    if v <= 0:
        return None
    return v if v > 1.0 else v * 100.0


def _ex_div_date(info: Dict) -> Optional[str]:
    """배당락일(ex-dividend date) → YYYY-MM-DD 문자열.

    info['exDividendDate'] 는 epoch(int) 또는 datetime/Timestamp 일 수 있다.
    """
    raw = info.get("exDividendDate")
    if raw is None:
        return None
    try:
        if isinstance(raw, (int, float)):
            return datetime.utcfromtimestamp(float(raw)).strftime("%Y-%m-%d")
        if isinstance(raw, (datetime, date)):
            return raw.strftime("%Y-%m-%d")
        if isinstance(raw, pd.Timestamp):
            return raw.strftime("%Y-%m-%d")
        # 이미 문자열
        return str(raw)[:10]
    except Exception:
        return None


def _cagr(start_val: float, end_val: float, years: int) -> Optional[float]:
    """배당 성장 CAGR (%) — v5 calc_cagr 이식."""
    if start_val <= 0 or end_val <= 0 or years <= 0:
        return None
    return (pow(end_val / start_val, 1.0 / years) - 1.0) * 100.0


def _grade(consecutive_inc: int, consecutive_div: int) -> Dict:
    """배당 등급 판정 — v5 _sd_render_history_v2 의 등급 로직 이식.

    color 는 hex(프론트가 자체 팔레트로 매핑할 수 있도록 grade key 도 제공).
    """
    if consecutive_inc >= 50:
        return {"key": "king", "label": "배당왕", "desc": "50년 이상 연속 배당 증가"}
    if consecutive_inc >= 25:
        return {"key": "aristocrat", "label": "배당귀족", "desc": "25년 이상 연속 배당 증가"}
    if consecutive_inc >= 10:
        return {"key": "achiever", "label": "배당성취자", "desc": "10년 이상 연속 배당 증가"}
    if consecutive_inc >= 5:
        return {"key": "grower", "label": "배당성장주", "desc": "5년 이상 연속 배당 증가"}
    if consecutive_div >= 5:
        return {"key": "payer", "label": "배당지급주", "desc": f"{consecutive_div}년 연속 배당 지급"}
    return {"key": "normal", "label": "일반", "desc": f"{consecutive_div}년 연속 배당"}


def _build_payload(ticker: str, dividends: pd.Series, info: Dict,
                   current_price: float) -> Optional[Dict]:
    """블로킹 계산 본체 (asyncio.to_thread 에서 실행).

    배당이 전혀 없으면 None 반환.
    """
    if dividends is None or len(dividends) == 0:
        return None

    is_kr = _is_kr(ticker)
    currency = "KRW" if is_kr else (info.get("currency") or "USD")

    # 시간대 제거 (인덱스가 tz-aware 일 수 있음)
    div = dividends.copy()
    if isinstance(div.index, pd.DatetimeIndex) and div.index.tz is not None:
        div.index = div.index.tz_localize(None)

    # --- 연도별 배당 합계 (v5: dividends.groupby(year).sum()) ---
    yearly_series = div.groupby(div.index.year).sum()
    dividends_dict: Dict[int, float] = {
        int(y): _safe_float(v) for y, v in yearly_series.items()
    }
    if not dividends_dict:
        return None

    now = pd.Timestamp.now()
    current_year = now.year

    sorted_years_asc = sorted(dividends_dict.keys())
    sorted_years_desc = sorted(dividends_dict.keys(), reverse=True)
    latest_year = sorted_years_asc[-1]
    first_year = sorted_years_asc[0]

    # 성장/CAGR/연속증가 지표는 "완료된 연도"만 사용한다.
    # (현재 연도는 부분 집계라 YoY·CAGR 을 왜곡시키므로 제외)
    # 단, history/차트/총배당연수는 v5 처럼 모든 연도를 그대로 보여준다.
    complete_years_asc = [y for y in sorted_years_asc if y < current_year]
    if not complete_years_asc:  # 완료 연도가 하나도 없으면(신규상장 등) 전체 사용
        complete_years_asc = sorted_years_asc
    complete_years_desc = sorted(complete_years_asc, reverse=True)
    metric_latest_year = complete_years_asc[-1]

    # --- 연간 배당금: 최근 12개월 합 (v5 의도: "연간 배당금") ---
    cutoff = now - pd.Timedelta(days=365)
    ttm = div[div.index >= cutoff]
    annual_dividend = _safe_float(ttm.sum()) if len(ttm) > 0 else 0.0
    # TTM 이 비어있으면(최근 1년 무배당이지만 과거 배당 있음) 최신 연도 합 사용
    if annual_dividend <= 0:
        annual_dividend = dividends_dict[latest_year]
    # 그래도 0 이면 info 의 dividendRate fallback (v5 _sd_render_current_v2)
    if annual_dividend <= 0:
        annual_dividend = _safe_float(info.get("dividendRate"), 0.0)

    # --- 배당수익률(%) ---
    div_yield = _normalize_yield(info.get("dividendYield"))
    if div_yield is None and current_price > 0 and annual_dividend > 0:
        div_yield = (annual_dividend / current_price) * 100.0
    div_yield = _safe_float(div_yield, 0.0)

    # --- 배당성향(%) ---
    payout = _safe_float(info.get("payoutRatio"), 0.0)
    payout_ratio = payout * 100.0 if payout else 0.0

    # --- 5년 평균 배당수익률 ---
    five_year_avg_yield = _normalize_yield(info.get("fiveYearAvgDividendYield"))

    # --- 배당락일 ---
    ex_div = _ex_div_date(info)

    # --- 배당 주기 추정 (연간 지급 횟수 → 라벨) ---
    # 현재 연도는 부분(미완)일 수 있어 과소집계되므로, 최근 완료된 연도들 중
    # 최대 지급 횟수를 주기 판정에 사용한다 (v5 는 "연배당" 고정이었음).
    current_year = now.year
    year_counts = div.groupby(div.index.year).size()
    complete = year_counts[year_counts.index < current_year]
    if len(complete) > 0:
        per_year = int(complete.tail(3).max())  # 최근 3개 완료 연도 중 최대
    else:
        per_year = int(year_counts.max()) if len(year_counts) > 0 else 0
    if per_year >= 11:
        frequency = "월배당"
    elif per_year >= 4:
        frequency = "분기배당"
    elif per_year >= 2:
        frequency = "반기배당"
    elif per_year == 1:
        frequency = "연배당"
    else:
        frequency = "정보 없음"

    # --- 연속 배당 지급 연수 (v5: 최신부터 gap 없이, 완료 연도 기준) ---
    consecutive_div = 0
    for i, year in enumerate(complete_years_desc):
        if i == 0:
            consecutive_div = 1
        elif complete_years_desc[i - 1] - year == 1:
            consecutive_div += 1
        else:
            break

    # --- 연속 배당 증가 연수 (v5: 최신부터 YoY 증가가 깨질 때까지, 완료 연도) ---
    consecutive_inc = 0
    for i in range(len(complete_years_desc) - 1):
        curr_year = complete_years_desc[i]
        prev_year = complete_years_desc[i + 1]
        if curr_year - prev_year == 1:
            if dividends_dict[curr_year] > dividends_dict[prev_year]:
                consecutive_inc += 1
            else:
                break
        else:
            break

    grade = _grade(consecutive_inc, consecutive_div)

    # --- 배당 증가율 (연간배당 YoY: 최신 완료 vs 직전 완료 연도) ---
    dividend_growth_yoy: Optional[float] = None
    if len(complete_years_asc) >= 2:
        prev_v = dividends_dict[complete_years_asc[-2]]
        curr_v = dividends_dict[complete_years_asc[-1]]
        if prev_v > 0:
            dividend_growth_yoy = ((curr_v - prev_v) / prev_v) * 100.0

    # --- 3/5/10년 CAGR (완료 연도 기준) ---
    cagr_3y = cagr_5y = cagr_10y = None
    for period, setter in ((3, "3"), (5, "5"), (10, "10")):
        target_year = metric_latest_year - period
        if target_year in dividends_dict:
            c = _cagr(dividends_dict[target_year], dividends_dict[metric_latest_year], period)
            if setter == "3":
                cagr_3y = c
            elif setter == "5":
                cagr_5y = c
            else:
                cagr_10y = c

    # --- 연평균 배당금 / 총 배당 연수 ---
    avg_dividend = sum(dividends_dict.values()) / len(dividends_dict)
    total_years = len(dividends_dict)

    # --- 연도별 history 배열 (차트용, 오름차순) + YoY 성장률 ---
    history: List[Dict] = []
    for i, y in enumerate(sorted_years_asc):
        amount = dividends_dict[y]
        if i == 0:
            growth = None
        else:
            prev = dividends_dict[sorted_years_asc[i - 1]]
            growth = ((amount - prev) / prev * 100.0) if prev > 0 else None
        history.append({
            "year": int(y),
            "amount": round(amount, 6),
            "growth": round(growth, 2) if growth is not None else None,
        })

    return {
        "ticker": ticker,
        "name": info.get("shortName") or info.get("longName") or ticker,
        "currency": currency,
        "current_price": round(_safe_float(current_price), 4),
        "dividend_yield": round(div_yield, 4),
        "annual_dividend": round(annual_dividend, 6),
        "payout_ratio": round(payout_ratio, 2),
        "five_year_avg_yield": round(five_year_avg_yield, 4) if five_year_avg_yield is not None else None,
        "ex_dividend_date": ex_div,
        "frequency": frequency,
        "dividend_growth": round(dividend_growth_yoy, 2) if dividend_growth_yoy is not None else None,
        "consecutive_increase_years": consecutive_inc,
        "consecutive_payment_years": consecutive_div,
        "grade": grade["label"],
        "grade_key": grade["key"],
        "grade_desc": grade["desc"],
        "cagr_3y": round(cagr_3y, 2) if cagr_3y is not None else None,
        "cagr_5y": round(cagr_5y, 2) if cagr_5y is not None else None,
        "cagr_10y": round(cagr_10y, 2) if cagr_10y is not None else None,
        "avg_dividend": round(avg_dividend, 6),
        "first_dividend_year": int(first_year),
        "total_dividend_years": total_years,
        "history": history,
    }


def _fetch(ticker: str) -> Optional[Dict]:
    """yfinance 블로킹 fetch: dividends Series + info + 현재가.

    yfinance_client.py 를 수정하지 않기 위해 이 서비스 안에서 직접 호출.
    배당이 없으면 None.
    """
    try:
        stock = yf.Ticker(ticker)
        dividends = stock.dividends
        if dividends is None or len(dividends) == 0:
            return None

        info = stock.info or {}

        # 현재가: info → 실패 시 최근 종가
        current_price = _safe_float(
            info.get("currentPrice") or info.get("regularMarketPrice"), 0.0
        )
        if current_price <= 0:
            hist = stock.history(period="5d")
            if not hist.empty:
                current_price = float(hist["Close"].iloc[-1])

        return {"dividends": dividends, "info": info, "current_price": current_price}
    except Exception:
        return None


class DividendService:
    """슈퍼배당: 배당 지표 분석 서비스."""

    async def get_dividends(self, ticker: str) -> Optional[Dict]:
        ticker = ticker.upper().strip()

        data = await asyncio.to_thread(_fetch, ticker)
        if not data:
            return None

        payload = await asyncio.to_thread(
            _build_payload,
            ticker,
            data["dividends"],
            data["info"],
            data["current_price"],
        )
        return payload
