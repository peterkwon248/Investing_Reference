"""기술적 지표 계산 모듈

원본: app.py lines 29433-29634
Streamlit 의존성 없이 순수 Python으로 추출
"""

import numpy as np
import pandas as pd
from typing import List, Dict, Tuple, Optional


def calc_all_indicators(data: pd.DataFrame) -> pd.DataFrame:
    """모든 기술적 지표 계산"""
    result = data.copy()

    # 이동평균
    for p in [5, 20, 60, 120]:
        if len(result) >= p:
            result[f'MA{p}'] = result['Close'].rolling(window=p).mean()

    # RSI
    delta = result['Close'].diff()
    gain = delta.where(delta > 0, 0).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss
    result['RSI'] = 100 - (100 / (1 + rs))

    # MACD
    exp1 = result['Close'].ewm(span=12, adjust=False).mean()
    exp2 = result['Close'].ewm(span=26, adjust=False).mean()
    result['MACD'] = exp1 - exp2
    result['MACD_Signal'] = result['MACD'].ewm(span=9, adjust=False).mean()
    result['MACD_Hist'] = result['MACD'] - result['MACD_Signal']

    # ATR
    high_low = result['High'] - result['Low']
    high_close = np.abs(result['High'] - result['Close'].shift())
    low_close = np.abs(result['Low'] - result['Close'].shift())
    tr = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
    result['ATR'] = tr.rolling(window=14).mean()

    # 볼린저 밴드
    result['BB_Mid'] = result['Close'].rolling(20).mean()
    result['BB_Std'] = result['Close'].rolling(20).std()
    result['BB_Upper'] = result['BB_Mid'] + 2 * result['BB_Std']
    result['BB_Lower'] = result['BB_Mid'] - 2 * result['BB_Std']

    # 거래량 이동평균
    result['Vol_MA20'] = result['Volume'].rolling(20).mean()

    return result


def find_support_resistance(data: pd.DataFrame, window: int = 20) -> Tuple[List[float], List[float]]:
    """지지/저항선 찾기"""
    supports, resistances = [], []
    for i in range(window, len(data) - window):
        if data['Low'].iloc[i] == data['Low'].iloc[i - window:i + window].min():
            supports.append(float(data['Low'].iloc[i]))
        if data['High'].iloc[i] == data['High'].iloc[i - window:i + window].max():
            resistances.append(float(data['High'].iloc[i]))

    def cluster(levels: List[float], threshold: float = 0.02) -> List[float]:
        if not levels:
            return []
        levels = sorted(levels)
        clustered = [levels[0]]
        for level in levels[1:]:
            if abs(level - clustered[-1]) / clustered[-1] > threshold:
                clustered.append(level)
        return clustered

    return cluster(supports)[-3:], cluster(resistances)[-3:]


def analyze_all(data: pd.DataFrame) -> Dict:
    """종합 기술적 분석 수행"""
    current = float(data['Close'].iloc[-1])
    analysis: Dict = {}

    # 이평선 분석
    ma20 = float(data['MA20'].iloc[-1]) if 'MA20' in data.columns and not pd.isna(data['MA20'].iloc[-1]) else None
    ma60 = float(data['MA60'].iloc[-1]) if 'MA60' in data.columns and not pd.isna(data['MA60'].iloc[-1]) else None
    ma120 = float(data['MA120'].iloc[-1]) if 'MA120' in data.columns and not pd.isna(data['MA120'].iloc[-1]) else None

    if ma20 and ma60 and ma120:
        if current > ma20 > ma60 > ma120:
            analysis['ma_status'] = 'perfect_bull'
            analysis['ma_score'] = 15
        elif current > ma20 > ma60:
            analysis['ma_status'] = 'bull'
            analysis['ma_score'] = 10
        elif current > ma20:
            analysis['ma_status'] = 'weak_bull'
            analysis['ma_score'] = 5
        elif current < ma20 < ma60 < ma120:
            analysis['ma_status'] = 'perfect_bear'
            analysis['ma_score'] = -15
        elif current < ma20 < ma60:
            analysis['ma_status'] = 'bear'
            analysis['ma_score'] = -10
        elif current < ma20:
            analysis['ma_status'] = 'weak_bear'
            analysis['ma_score'] = -5
        else:
            analysis['ma_status'] = 'neutral'
            analysis['ma_score'] = 0
    else:
        analysis['ma_status'] = 'neutral'
        analysis['ma_score'] = 0

    # RSI 분석
    rsi = float(data['RSI'].iloc[-1]) if 'RSI' in data.columns and not pd.isna(data['RSI'].iloc[-1]) else 50.0
    analysis['rsi'] = rsi
    if rsi < 30:
        analysis['rsi_status'] = 'oversold'
        analysis['rsi_score'] = 10
    elif rsi < 40:
        analysis['rsi_status'] = 'buy_interest'
        analysis['rsi_score'] = 5
    elif rsi > 70:
        analysis['rsi_status'] = 'overbought'
        analysis['rsi_score'] = -10
    elif rsi > 60:
        analysis['rsi_status'] = 'sell_interest'
        analysis['rsi_score'] = -5
    else:
        analysis['rsi_status'] = 'neutral'
        analysis['rsi_score'] = 0

    # MACD 분석
    hist = float(data['MACD_Hist'].iloc[-1]) if 'MACD_Hist' in data.columns else 0
    prev_hist = float(data['MACD_Hist'].iloc[-2]) if 'MACD_Hist' in data.columns and len(data) > 1 else 0

    if not pd.isna(hist) and not pd.isna(prev_hist):
        if hist > 0 and prev_hist < 0:
            analysis['macd_status'] = 'golden_cross'
            analysis['macd_score'] = 10
        elif hist < 0 and prev_hist > 0:
            analysis['macd_status'] = 'dead_cross'
            analysis['macd_score'] = -10
        elif hist > 0 and hist > prev_hist:
            analysis['macd_status'] = 'bullish_momentum'
            analysis['macd_score'] = 5
        elif hist > 0:
            analysis['macd_status'] = 'weakening_bull'
            analysis['macd_score'] = 2
        elif hist < 0 and hist < prev_hist:
            analysis['macd_status'] = 'bearish_momentum'
            analysis['macd_score'] = -5
        else:
            analysis['macd_status'] = 'recovering'
            analysis['macd_score'] = 2
    else:
        analysis['macd_status'] = 'neutral'
        analysis['macd_score'] = 0

    # 거래량 분석
    today_vol = float(data['Volume'].iloc[-1])
    avg_vol = float(data['Vol_MA20'].iloc[-1]) if 'Vol_MA20' in data.columns else today_vol
    vol_ratio = today_vol / avg_vol if avg_vol > 0 else 1
    analysis['vol_ratio'] = vol_ratio

    prev_close = float(data['Close'].iloc[-2]) if len(data) > 1 else current
    price_change = (current - prev_close) / prev_close if prev_close > 0 else 0
    analysis['price_change'] = price_change * 100

    if price_change > 0.005 and vol_ratio > 1.5:
        analysis['vol_status'] = 'strong_buy'
        analysis['vol_score'] = 15
    elif price_change < -0.005 and vol_ratio < 0.7:
        analysis['vol_status'] = 'exhaustion'
        analysis['vol_score'] = 10
    elif price_change < -0.005 and vol_ratio > 1.5:
        analysis['vol_status'] = 'strong_sell'
        analysis['vol_score'] = -15
    elif price_change > 0.005 and vol_ratio < 0.7:
        analysis['vol_status'] = 'hollow_rise'
        analysis['vol_score'] = -5
    else:
        analysis['vol_status'] = 'neutral'
        analysis['vol_score'] = 0

    # 매집/분산
    up_vol, down_vol = 0.0, 0.0
    for i in range(-10, 0):
        if float(data['Close'].iloc[i]) > float(data['Open'].iloc[i]):
            up_vol += float(data['Volume'].iloc[i])
        else:
            down_vol += float(data['Volume'].iloc[i])

    acc_ratio = up_vol / down_vol if down_vol > 0 else 1
    analysis['acc_ratio'] = acc_ratio
    if acc_ratio > 1.5:
        analysis['acc_status'] = 'accumulation'
    elif acc_ratio < 0.7:
        analysis['acc_status'] = 'distribution'
    else:
        analysis['acc_status'] = 'neutral'

    # 종합 점수
    total_score = 50 + analysis['ma_score'] + analysis['rsi_score'] + analysis['macd_score'] + analysis['vol_score']
    analysis['total_score'] = max(0, min(100, total_score))

    # 지지/저항선
    supports, resistances = find_support_resistance(data)
    analysis['supports'] = supports
    analysis['resistances'] = resistances

    return analysis
