from typing import Optional, List, Dict
from app.data.yfinance_client import (
    get_exchange_rate,
    get_stock_price,
    get_stock_history,
    search_stock,
)
from app.services.cache_service import CacheService


class StockService:
    async def get_exchange_rate(self) -> float:
        cached = await CacheService.get("exchange_rate")
        if cached:
            return cached
        rate = get_exchange_rate()
        await CacheService.set("exchange_rate", rate, ttl=600)  # 10min
        return rate

    async def get_price(self, ticker: str) -> Optional[Dict]:
        cached = await CacheService.get(f"price:{ticker}")
        if cached:
            return cached
        data = get_stock_price(ticker)
        if data:
            await CacheService.set(f"price:{ticker}", data, ttl=120)  # 2min
        return data

    async def get_history(
        self, ticker: str, period: str = "1y", interval: str = "1d"
    ) -> List[Dict]:
        cached = await CacheService.get(f"history:{ticker}:{period}:{interval}")
        if cached:
            return cached
        data = get_stock_history(ticker, period, interval)
        if data:
            await CacheService.set(
                f"history:{ticker}:{period}:{interval}", data, ttl=300
            )  # 5min
        return data

    async def search(self, query: str) -> List[Dict]:
        cached = await CacheService.get(f"search:{query}")
        if cached:
            return cached
        data = search_stock(query)
        if data:
            await CacheService.set(f"search:{query}", data, ttl=3600)  # 1hour
        return data
