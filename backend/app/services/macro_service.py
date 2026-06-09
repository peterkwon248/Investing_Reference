"""매크로 시장 진단 서비스

v5 render_macro_mode(app.py line 34371)의 "🤖 AI 시장 진단" 코어(약 34381~34650)를 이식:

- 주요 글로벌 지표 ~9개의 1개월 가격 이력을 yfinance 에서 동시(asyncio.gather)에 fetch
- 지표별 {current, change_1d, change_1m, high_1m, low_1m} 계산
- v5 의 RULE-BASED(결정론적) 스코어링으로 signals 리스트 + overall_score(-100..+100) 산출
- overall_score → market_status(강세장/상승우위/중립횡보/하락우위/약세장, 각각 color_key/why/action)
- overall_score → strategy(전략 제안) 블록

LLM/FRED/뉴스 API 를 쓰지 않는 100% 결정론적 규칙이다. (v5 와 동일)

yfinance 는 이 서비스 안에서 직접 fetch 한다(yfinance_client.py 는 수정하지 않는다).
블로킹(yfinance, pandas)은 asyncio.to_thread 로 오프로드하고, 지표는 동시에 모은다.
개별 티커 실패는 무시하고, 모든 지표가 실패한 경우에만 None 을 반환한다.
"""

import asyncio
import math
from datetime import datetime
from typing import Optional, Dict, List

import pandas as pd
import yfinance as yf


# v5 indicators 딕셔너리 (app.py line 34389)
# name -> (yfinance ticker)
INDICATORS = {
    "VIX": "^VIX",      # 공포지수
    "SPY": "SPY",       # S&P 500
    "QQQ": "QQQ",       # NASDAQ
    "TLT": "TLT",       # 20년 국채 ETF (금리 역방향)
    "GLD": "GLD",       # 금
    "DXY": "UUP",       # 달러 ETF
    "HYG": "HYG",       # 하이일드 채권 (위험선호)
    "USO": "USO",       # 원유
}

# 환율은 별도로 처리 (v5 와 동일)
USDKRW_TICKER = "USDKRW=X"


def _safe_float(value, default: float = 0.0) -> float:
    """NaN/Inf 를 JSON 안전한 값으로 변환."""
    try:
        f = float(value)
    except (TypeError, ValueError):
        return default
    if math.isnan(f) or math.isinf(f):
        return default
    return f


def _fetch_history(ticker: str) -> Optional[pd.DataFrame]:
    """단일 티커의 1개월 이력(블로킹). 실패 시 None."""
    try:
        hist = yf.Ticker(ticker).history(period="1mo")
        if hist is None or hist.empty:
            return None
        return hist
    except Exception:
        return None


def _indicator_stats(hist: pd.DataFrame) -> Optional[Dict]:
    """v5 data[name] 형태의 지표 통계 계산.

    {current, prev, month_ago, change_1d, change_1m, high_1m, low_1m}
    이력이 2개 미만이면 None.
    """
    if hist is None or hist.empty:
        return None
    closes = hist["Close"]
    if len(closes) < 2:
        return None

    current = _safe_float(closes.iloc[-1])
    prev = _safe_float(closes.iloc[-2])
    month_ago = _safe_float(closes.iloc[0])

    change_1d = ((current / prev) - 1) * 100 if prev else 0.0
    change_1m = ((current / month_ago) - 1) * 100 if month_ago else 0.0

    return {
        "current": current,
        "prev": prev,
        "month_ago": month_ago,
        "change_1d": _safe_float(change_1d),
        "change_1m": _safe_float(change_1m),
        "high_1m": _safe_float(closes.max()),
        "low_1m": _safe_float(closes.min()),
    }


def _build_signals(data: Dict[str, Dict]) -> (List[Dict], int):
    """v5 rule-based 스코어링 (app.py line 34431~34529).

    data: {name: indicator_stats} (실패 지표는 키가 없음)
    반환: (signals, overall_score)
    signals 각 항목: {emoji, name, value, status, advice}
    overall_score: -100 ~ +100 (극단적 약세 ~ 극단적 강세)
    """
    signals: List[Dict] = []
    overall_score = 0  # -100 (극단적 약세) ~ +100 (극단적 강세)

    def add(emoji: str, name: str, value: str, status: str, advice: str) -> None:
        signals.append({
            "emoji": emoji,
            "name": name,
            "value": value,
            "status": status,
            "advice": advice,
        })

    # 1. VIX 분석
    if "VIX" in data:
        vix = data["VIX"]["current"]
        if vix < 15:
            add("🟢", "VIX", f"{vix:.1f}", "극도의 낙관 (과열 주의)", "시장 안일함, 급락 가능성 경계")
            overall_score -= 10
        elif vix < 20:
            add("🟢", "VIX", f"{vix:.1f}", "정상 범위", "안정적인 상승장 환경")
            overall_score += 20
        elif vix < 25:
            add("🟡", "VIX", f"{vix:.1f}", "경계 구간", "변동성 확대 중")
            overall_score += 0
        elif vix < 30:
            add("🟠", "VIX", f"{vix:.1f}", "공포 확산", "단기 조정 가능, 분할매수 고려")
            overall_score += 10
        else:
            add("🔴", "VIX", f"{vix:.1f}", "극단적 공포", "역발상 매수 기회! 공포에 사라")
            overall_score += 30

    # 2. 주식시장 추세 (SPY 1개월)
    if "SPY" in data:
        spy_1m = data["SPY"]["change_1m"]
        if spy_1m > 5:
            add("🟢", "S&P500", f"{spy_1m:+.1f}% (1개월)", "강한 상승 추세", "추세 추종 유효")
            overall_score += 20
        elif spy_1m > 0:
            add("🟢", "S&P500", f"{spy_1m:+.1f}% (1개월)", "완만한 상승", "긍정적 흐름 유지")
            overall_score += 10
        elif spy_1m > -5:
            add("🟡", "S&P500", f"{spy_1m:+.1f}% (1개월)", "횡보/조정", "관망 또는 분할매수")
            overall_score -= 5
        else:
            add("🔴", "S&P500", f"{spy_1m:+.1f}% (1개월)", "하락 추세", "현금 비중 확대 고려")
            overall_score -= 20

    # 3. 나스닥 vs S&P (성장주 선호도) — 점수에는 영향 없음 (v5 동일)
    if "QQQ" in data and "SPY" in data:
        qqq_spy_ratio = data["QQQ"]["change_1m"] - data["SPY"]["change_1m"]
        if qqq_spy_ratio > 2:
            add("🟢", "성장주", f"QQQ {qqq_spy_ratio:+.1f}%p 우위", "성장주 선호", "기술주/성장주 비중 확대")
        elif qqq_spy_ratio < -2:
            add("🟠", "가치주", f"SPY {-qqq_spy_ratio:+.1f}%p 우위", "가치주/방어주 선호", "배당주/가치주 관심")

    # 4. 금 (안전자산)
    if "GLD" in data:
        gld_1m = data["GLD"]["change_1m"]
        if gld_1m > 3:
            add("🟡", "금", f"{gld_1m:+.1f}% (1개월)", "안전자산 선호 ↑", "불확실성 증가 신호")
            overall_score -= 5
        elif gld_1m < -3:
            add("🟢", "금", f"{gld_1m:+.1f}% (1개월)", "위험자산 선호 ↑", "주식에 우호적")
            overall_score += 5

    # 5. 채권 (TLT - 금리 역방향)
    if "TLT" in data:
        tlt_1m = data["TLT"]["change_1m"]
        if tlt_1m > 3:
            add("🟢", "채권(TLT)", f"{tlt_1m:+.1f}% (1개월)", "금리 하락 기대", "성장주에 긍정적")
            overall_score += 10
        elif tlt_1m < -3:
            add("🟠", "채권(TLT)", f"{tlt_1m:+.1f}% (1개월)", "금리 상승 압력", "성장주 밸류에이션 부담")
            overall_score -= 10

    # 6. 하이일드 채권 (위험선호 지표)
    if "HYG" in data:
        hyg_1m = data["HYG"]["change_1m"]
        if hyg_1m > 1:
            add("🟢", "하이일드", f"{hyg_1m:+.1f}% (1개월)", "신용 스프레드 축소", "위험자산 우호적")
            overall_score += 10
        elif hyg_1m < -2:
            add("🔴", "하이일드", f"{hyg_1m:+.1f}% (1개월)", "신용 스프레드 확대", "신용 위험 경계")
            overall_score -= 15

    # 7. 원/달러 환율
    if "USDKRW" in data:
        krw = data["USDKRW"]["current"]
        if krw > 1450:
            add("🔴", "원/달러", f"₩{krw:,.0f}", "원화 약세 심화", "외국인 이탈 가능, 환헤지 고려")
            overall_score -= 10
        elif krw > 1350:
            add("🟠", "원/달러", f"₩{krw:,.0f}", "원화 약세 구간", "수출주에는 긍정적")
        elif krw < 1250:
            add("🟢", "원/달러", f"₩{krw:,.0f}", "원화 강세", "외국인 유입 기대")
            overall_score += 10
        else:
            add("🟡", "원/달러", f"₩{krw:,.0f}", "적정 범위", "환율 중립")

    # 8. 달러 강도 (UUP)
    if "DXY" in data:
        dxy_1m = data["DXY"]["change_1m"]
        if dxy_1m > 2:
            add("🟠", "달러(UUP)", f"{dxy_1m:+.1f}% (1개월)", "강달러 진행", "신흥국/원자재 약세 요인")
            overall_score -= 5
        elif dxy_1m < -2:
            add("🟢", "달러(UUP)", f"{dxy_1m:+.1f}% (1개월)", "약달러 진행", "신흥국/원자재 우호적")
            overall_score += 5

    return signals, overall_score


def _market_status(overall_score: int) -> Dict:
    """overall_score → market_status (v5 line 34532~34551).

    color_key 는 프론트 토큰 규칙(emerald/amber/rose 계열)에 매핑하기 위한
    의미 키이다. v5 의 HEX 색상도 함께 보존한다.
    """
    if overall_score >= 30:
        return {
            "status": "🟢 강세장",
            "color_key": "strong_bull",
            "color_hex": "#22c55e",
            "why": (
                "주요 지표(VIX, 금리, 달러, 주가 모멘텀)가 모두 우호적입니다. "
                "역사적으로 이런 환경에서 추세 추종 전략이 가장 효과적이었습니다."
            ),
            "action": "적극 매수 환경 - 추세 추종 전략 유효",
        }
    if overall_score >= 10:
        return {
            "status": "🟢 상승 우위",
            "color_key": "bull",
            "color_hex": "#86efac",
            "why": (
                "대체로 긍정적인 환경이나 일부 경계 신호가 있습니다. "
                "무리한 레버리지보다는 안정적인 분할매수가 적합합니다."
            ),
            "action": "완만한 매수 - 분할매수 추천",
        }
    if overall_score >= -10:
        return {
            "status": "🟡 중립/횡보",
            "color_key": "neutral",
            "color_hex": "#fbbf24",
            "why": (
                "상승과 하락 요인이 혼재되어 뚜렷한 방향이 없습니다. "
                "이 시기에는 매크로보다 개별 종목 선별이 중요합니다."
            ),
            "action": "관망 또는 종목별 선별 접근",
        }
    if overall_score >= -30:
        return {
            "status": "🟠 하락 우위",
            "color_key": "bear",
            "color_hex": "#fb923c",
            "why": (
                "부정적 신호가 우세합니다. 시장 전체가 하락 압력을 받을 수 있어 "
                "방어적 포지션이 필요합니다."
            ),
            "action": "현금 비중 확대, 방어적 포지션",
        }
    return {
        "status": "🔴 약세장",
        "color_key": "strong_bear",
        "color_hex": "#ef4444",
        "why": (
            "주요 지표 대부분이 부정적입니다. 역사적으로 이런 극단적 환경은 오래 "
            "지속되지 않으며, 역발상 매수 기회가 될 수 있습니다."
        ),
        "action": "현금 확보, 역발상 매수 준비",
    }


def _strategy(overall_score: int) -> Dict:
    """전략 제안 블록 (v5 line 34609~34640).

    tone 은 v5 의 st.success/info/warning/error 에 대응한다.
    """
    if overall_score >= 20:
        return {
            "tone": "success",
            "title": "적극 매수 전략",
            "points": [
                "주식 비중: 70-90% 유지",
                "성장주/기술주 중심 포트폴리오",
                "레버리지 ETF 활용 가능 (TQQQ, SOXL 등)",
                "현금은 조정 시 추가 매수용으로 10-20% 보유",
            ],
        }
    if overall_score >= 0:
        return {
            "tone": "info",
            "title": "분할 매수 전략",
            "points": [
                "주식 비중: 50-70%",
                "대형주 + 배당주 혼합",
                "월/주 단위 정기 분할매수 추천",
                "변동성 대비 현금 30% 이상 보유",
            ],
        }
    if overall_score >= -20:
        return {
            "tone": "warning",
            "title": "방어적 전략",
            "points": [
                "주식 비중: 30-50%로 축소",
                "배당주/가치주/방어섹터 중심",
                "채권 ETF (TLT, BND) 비중 확대",
                "급락 시 매수할 현금 충분히 확보",
            ],
        }
    return {
        "tone": "error",
        "title": "현금 확보 + 역발상 준비",
        "points": [
            "주식 비중: 20-30%",
            "기존 포지션 손절/익절 정리",
            "VIX 30+ 돌파 시 분할매수 시작",
            '"남들이 공포에 팔 때" 매수 기회 포착',
        ],
    }


def _build_payload(data: Dict[str, Dict]) -> Dict:
    """수집된 지표 dict → 최종 응답 payload (블로킹 없음, 순수 계산)."""
    signals, overall_score = _build_signals(data)
    status = _market_status(overall_score)
    strategy = _strategy(overall_score)

    # 지표 스냅샷(테이블 외 추가 정보용): 실패 지표는 제외
    indicators_out: Dict[str, Dict] = {}
    for name, stats in data.items():
        indicators_out[name] = {
            "current": round(stats.get("current", 0.0), 4),
            "change_1d": round(stats.get("change_1d", 0.0), 4),
            "change_1m": round(stats.get("change_1m", 0.0), 4),
            "high_1m": round(stats.get("high_1m", 0.0), 4),
            "low_1m": round(stats.get("low_1m", 0.0), 4),
        }

    return {
        "overall_score": int(overall_score),
        "market_status": status,
        "signals": signals,
        "strategy": strategy,
        "indicators": indicators_out,
        "as_of": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "disclaimer": "이 분석은 참고용이며 투자 결정은 본인 책임입니다.",
    }


class MacroService:
    """매크로 AI 시장 진단 서비스 (티커 파라미터 없음, 시장 전체 스냅샷)."""

    async def get_market(self) -> Optional[Dict]:
        # 1) ~9개 지표의 1개월 이력을 동시에 fetch (개별 실패 허용)
        names = list(INDICATORS.keys())
        tickers = list(INDICATORS.values())

        tasks = [asyncio.to_thread(_fetch_history, t) for t in tickers]
        tasks.append(asyncio.to_thread(_fetch_history, USDKRW_TICKER))  # USDKRW

        results = await asyncio.gather(*tasks, return_exceptions=True)

        data: Dict[str, Dict] = {}

        # 일반 지표
        for name, res in zip(names, results[:-1]):
            if isinstance(res, Exception) or res is None:
                continue
            stats = _indicator_stats(res)
            if stats is not None:
                data[name] = stats

        # USDKRW (마지막 결과)
        krw_res = results[-1]
        if not isinstance(krw_res, Exception) and krw_res is not None:
            krw_stats = _indicator_stats(krw_res)
            if krw_stats is not None:
                data["USDKRW"] = krw_stats

        # 2) 모든 지표 실패 → None (503 처리는 라우터에서)
        if not data:
            return None

        # 3) 순수 계산으로 payload 빌드
        return _build_payload(data)
