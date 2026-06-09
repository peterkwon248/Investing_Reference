import yfinance as yf
from typing import Optional, List, Dict
import pandas as pd


def get_exchange_rate() -> float:
    try:
        ticker = yf.Ticker("USDKRW=X")
        hist = ticker.history(period="1d")
        if not hist.empty:
            return float(hist['Close'].iloc[-1])
    except Exception:
        pass
    return 1400


def get_stock_price(ticker: str) -> Optional[Dict]:
    try:
        stock = yf.Ticker(ticker)
        info = stock.info
        hist = stock.history(period="5d")
        if hist.empty:
            return None

        current = float(hist['Close'].iloc[-1])
        prev = float(hist['Close'].iloc[-2]) if len(hist) > 1 else current
        change = current - prev
        change_pct = (change / prev * 100) if prev > 0 else 0

        return {
            "ticker": ticker,
            "name": info.get("shortName", ticker),
            "price": current,
            "change": change,
            "change_percent": change_pct,
            "volume": int(hist['Volume'].iloc[-1]) if 'Volume' in hist.columns else 0,
            "market_cap": info.get("marketCap"),
            "currency": info.get("currency", "USD"),
        }
    except Exception:
        return None


def get_stock_history(ticker: str, period: str = "1y", interval: str = "1d") -> List[Dict]:
    try:
        stock = yf.Ticker(ticker)
        hist = stock.history(period=period, interval=interval)
        if hist.empty:
            return []

        result = []
        for date, row in hist.iterrows():
            result.append({
                "date": str(date.date()),
                "open": round(float(row['Open']), 2),
                "high": round(float(row['High']), 2),
                "low": round(float(row['Low']), 2),
                "close": round(float(row['Close']), 2),
                "volume": int(row['Volume']),
            })
        return result
    except Exception:
        return []


def search_stock(query: str) -> List[Dict]:
    try:
        ticker = yf.Ticker(query.upper())
        info = ticker.info
        if info.get('symbol'):
            return [{
                "ticker": info['symbol'],
                "name": info.get("shortName", info['symbol']),
                "market": "US",
                "exchange": info.get("exchange", ""),
            }]
    except Exception:
        pass
    return []


def get_analysis_data(ticker: str) -> Optional[Dict]:
    """대가분석용 원시 데이터: 펀더멘털(info) + 1년 가격 이력(DataFrame) + 현재가"""
    try:
        stock = yf.Ticker(ticker)
        info = stock.info or {}
        hist = stock.history(period="1y")
        if hist.empty:
            return None
        current_price = float(hist['Close'].iloc[-1])
        return {"info": info, "hist": hist, "current_price": current_price}
    except Exception:
        return None
