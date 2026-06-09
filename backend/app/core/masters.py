"""대가 분석 스코어링 모듈

원본: app.py lines 33432-33688
버핏, 린치, 그레이엄, 드러켄밀러, 코스톨라니 5종 대가 분석
"""

import numpy as np
import pandas as pd
from typing import Dict, Tuple


def calc_buffett_score(info: Dict, hist: pd.DataFrame) -> Tuple[int, str]:
    """워렌 버핏 스타일 점수 계산"""
    score = 50
    reasons = []

    roe = info.get('returnOnEquity', 0) or 0
    if roe > 0.20:
        score += 15
        reasons.append(f"ROE {roe*100:.1f}%로 우수")
    elif roe > 0.15:
        score += 10
        reasons.append(f"ROE {roe*100:.1f}%로 양호")
    elif roe > 0:
        score += 5
    else:
        score -= 10
        reasons.append("ROE 정보 없음")

    debt_equity = info.get('debtToEquity', 0) or 0
    if debt_equity < 50:
        score += 10
        reasons.append("부채비율 낮음")
    elif debt_equity > 100:
        score -= 10
        reasons.append("부채비율 높음 주의")

    profit_margin = info.get('profitMargins', 0) or 0
    if profit_margin > 0.20:
        score += 10
        reasons.append(f"이익률 {profit_margin*100:.1f}% 우수")
    elif profit_margin > 0.10:
        score += 5

    pe = info.get('trailingPE', 0) or 0
    if 0 < pe < 15:
        score += 10
        reasons.append("합리적인 밸류에이션")
    elif pe > 30:
        score -= 10
        reasons.append("밸류에이션 다소 높음")

    score = max(0, min(100, score))

    if score >= 70:
        opinion = f"경제적 해자가 있고, {', '.join(reasons[:2])}. 장기 보유 가치가 있습니다."
    elif score >= 50:
        opinion = f"괜찮은 기업이지만, 완벽하진 않습니다. {reasons[0] if reasons else '추가 분석 필요'}."
    else:
        opinion = f"제 기준에는 맞지 않습니다. {reasons[0] if reasons else '안전마진 부족'}."

    return score, opinion


def calc_lynch_score(info: Dict, hist: pd.DataFrame) -> Tuple[int, str]:
    """피터 린치 스타일 점수 계산"""
    score = 50
    reasons = []

    pe = info.get('trailingPE', 0) or 0
    growth = info.get('earningsGrowth', 0) or info.get('revenueGrowth', 0) or 0

    if pe > 0 and growth > 0:
        peg = pe / (growth * 100) if growth * 100 > 0 else 99
        if peg < 1:
            score += 20
            reasons.append(f"PEG {peg:.2f}로 저평가")
        elif peg < 1.5:
            score += 10
            reasons.append(f"PEG {peg:.2f}로 적정")
        elif peg > 2:
            score -= 10
            reasons.append(f"PEG {peg:.2f}로 고평가")

    if growth > 0.25:
        score += 15
        reasons.append(f"성장률 {growth*100:.1f}% 고성장")
    elif growth > 0.15:
        score += 10
        reasons.append(f"성장률 {growth*100:.1f}% 양호")
    elif growth > 0:
        score += 5

    market_cap = info.get('marketCap', 0) or 0
    if market_cap < 10e9:
        score += 5
        reasons.append("중소형주 - 10배 가능성")

    score = max(0, min(100, score))

    if score >= 70:
        category = "고성장주"
        opinion = f"{category}로 분류됩니다. {', '.join(reasons[:2])}. 성장 스토리가 매력적입니다."
    elif score >= 50:
        category = "대형 우량주"
        opinion = f"{category}로 분류됩니다. {reasons[0] if reasons else '안정적이지만'} 10배 종목은 아닙니다."
    else:
        opinion = f"성장성이 부족합니다. {reasons[0] if reasons else 'PEG 확인 필요'}."

    return score, opinion


def calc_graham_score(info: Dict, hist: pd.DataFrame, current_price: float) -> Tuple[int, str]:
    """벤저민 그레이엄 스타일 점수 계산"""
    score = 50
    reasons = []

    pe = info.get('trailingPE', 0) or 0
    if 0 < pe <= 15:
        score += 20
        reasons.append(f"P/E {pe:.1f} 기준 충족")
    elif pe > 20:
        score -= 15
        reasons.append(f"P/E {pe:.1f} 기준 초과")

    pb = info.get('priceToBook', 0) or 0
    if 0 < pb <= 1.5:
        score += 15
        reasons.append(f"P/B {pb:.2f} 저평가")
    elif pb > 3:
        score -= 10
        reasons.append(f"P/B {pb:.2f} 고평가")

    eps = info.get('trailingEps', 0) or 0
    bvps = info.get('bookValue', 0) or 0
    if eps > 0 and bvps > 0:
        graham_number = (22.5 * eps * bvps) ** 0.5
        if current_price < graham_number:
            score += 15
            reasons.append(f"그레이엄 넘버 ${graham_number:.2f} 이하")
        else:
            margin = (current_price - graham_number) / graham_number * 100
            if margin > 50:
                score -= 15
                reasons.append(f"그레이엄 넘버 대비 {margin:.0f}% 고평가")

    div_yield = (info.get('dividendYield', 0) or 0) * 100
    if div_yield >= 2:
        score += 10
        reasons.append(f"배당률 {div_yield:.1f}% 양호")

    score = max(0, min(100, score))

    if score >= 70:
        opinion = f"가치투자 기준 충족! {', '.join(reasons[:2])}. 안전마진이 있습니다."
    elif score >= 50:
        opinion = f"일부 기준 충족. {reasons[0] if reasons else '추가 분석 필요'}."
    else:
        opinion = f"제 기준(P/E<15, P/B<1.5)을 충족하지 못합니다. {reasons[0] if reasons else '패스하겠습니다'}."

    return score, opinion


def calc_druckenmiller_score(info: Dict, hist: pd.DataFrame) -> Tuple[int, str]:
    """스탠리 드러켄밀러 스타일 점수 계산"""
    score = 50
    reasons = []

    if len(hist) >= 200:
        ma50 = float(hist['Close'].rolling(50).mean().iloc[-1])
        ma200 = float(hist['Close'].rolling(200).mean().iloc[-1])
        current = float(hist['Close'].iloc[-1])

        if current > ma50 > ma200:
            score += 20
            reasons.append("상승 추세 확인")
        elif current > ma50:
            score += 10
            reasons.append("단기 상승 추세")
        elif current < ma50 < ma200:
            score -= 15
            reasons.append("하락 추세 주의")

    if len(hist) >= 60:
        momentum_60d = (float(hist['Close'].iloc[-1]) - float(hist['Close'].iloc[-60])) / float(hist['Close'].iloc[-60]) * 100
        if momentum_60d > 20:
            score += 15
            reasons.append(f"60일 모멘텀 +{momentum_60d:.1f}% 강함")
        elif momentum_60d > 10:
            score += 10
            reasons.append(f"60일 모멘텀 +{momentum_60d:.1f}%")
        elif momentum_60d < -10:
            score -= 10
            reasons.append(f"60일 모멘텀 {momentum_60d:.1f}% 약함")

    if len(hist) >= 20:
        volatility = float(hist['Close'].pct_change().std() * (252 ** 0.5) * 100)
        if volatility < 30:
            score += 5
            reasons.append("변동성 적정")
        elif volatility > 50:
            score -= 5
            reasons.append("변동성 높음")

    score = max(0, min(100, score))

    if score >= 70:
        opinion = f"추세와 모멘텀이 살아있습니다. {', '.join(reasons[:2])}. 매크로도 확인하세요."
    elif score >= 50:
        opinion = f"추세는 있지만 확신은 어렵습니다. {reasons[0] if reasons else '추가 분석 필요'}."
    else:
        opinion = f"추세가 약합니다. {reasons[0] if reasons else '지금은 관망'}. 더 좋은 타이밍을 기다리세요."

    return score, opinion


def calc_kostolany_score(info: Dict, hist: pd.DataFrame) -> Tuple[int, str]:
    """앙드레 코스톨라니 스타일 점수 계산"""
    score = 50
    reasons = []

    if len(hist) >= 200:
        current = float(hist['Close'].iloc[-1])
        high_52w = float(hist['Close'].tail(252).max())
        low_52w = float(hist['Close'].tail(252).min())

        position = (current - low_52w) / (high_52w - low_52w) * 100 if high_52w > low_52w else 50

        if position < 30:
            score += 20
            reasons.append("달걀 모형 하단 - 매수 기회")
        elif position > 80:
            score -= 10
            reasons.append("달걀 모형 상단 - 과열 주의")
        else:
            score += 5
            reasons.append("달걀 모형 중간 구간")

    if len(hist) >= 60:
        recent_vol = float(hist['Volume'].tail(20).mean())
        past_vol = float(hist['Volume'].tail(60).head(40).mean())
        vol_change = (recent_vol - past_vol) / past_vol * 100 if past_vol > 0 else 0

        if vol_change > 100:
            score -= 10
            reasons.append("거래량 급증 - 부화뇌동파 유입 주의")
        elif vol_change < -30:
            score += 10
            reasons.append("거래량 감소 - 침체기 근처")

    score = max(0, min(100, score))

    if score >= 70:
        opinion = f"달걀 모형상 좋은 위치입니다. {', '.join(reasons[:2])}. 소신파처럼 행동하세요."
    elif score >= 50:
        opinion = f"중립적인 위치입니다. {reasons[0] if reasons else '시장 심리 주시'}. 돈과 심리를 지켜보세요."
    else:
        opinion = f"지금은 부화뇌동파가 들어오는 시기입니다. {reasons[0] if reasons else '과열 주의'}. 기다리세요."

    return score, opinion


def analyze_all_masters(ticker: str, info: Dict, hist: pd.DataFrame, current_price: float) -> Dict:
    """5대 대가 종합 분석"""
    results = {}

    buffett_score, buffett_opinion = calc_buffett_score(info, hist)
    results['buffett'] = {'score': buffett_score, 'opinion': buffett_opinion, 'name': '워렌 버핏'}

    lynch_score, lynch_opinion = calc_lynch_score(info, hist)
    results['lynch'] = {'score': lynch_score, 'opinion': lynch_opinion, 'name': '피터 린치'}

    graham_score, graham_opinion = calc_graham_score(info, hist, current_price)
    results['graham'] = {'score': graham_score, 'opinion': graham_opinion, 'name': '벤저민 그레이엄'}

    druckenmiller_score, druckenmiller_opinion = calc_druckenmiller_score(info, hist)
    results['druckenmiller'] = {'score': druckenmiller_score, 'opinion': druckenmiller_opinion, 'name': '스탠리 드러켄밀러'}

    kostolany_score, kostolany_opinion = calc_kostolany_score(info, hist)
    results['kostolany'] = {'score': kostolany_score, 'opinion': kostolany_opinion, 'name': '앙드레 코스톨라니'}

    # 종합 평균
    avg_score = sum(r['score'] for r in results.values()) / len(results)
    results['average_score'] = round(avg_score, 1)
    results['ticker'] = ticker

    return results
