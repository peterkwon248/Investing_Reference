from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import Favorite


class FavoriteService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_all(self) -> List[Favorite]:
        result = await self.db.execute(
            select(Favorite).order_by(Favorite.added_at.desc())
        )
        return list(result.scalars().all())

    async def add(
        self, ticker: str, name: str = "", market: str = "US"
    ) -> Favorite:
        existing = await self.get_by_ticker(ticker)
        if existing:
            return existing
        favorite = Favorite(ticker=ticker, name=name, market=market)
        self.db.add(favorite)
        await self.db.flush()
        await self.db.refresh(favorite)
        return favorite

    async def remove(self, ticker: str) -> bool:
        result = await self.db.execute(
            select(Favorite).where(Favorite.ticker == ticker)
        )
        favorite = result.scalar_one_or_none()
        if not favorite:
            return False
        await self.db.delete(favorite)
        await self.db.flush()
        return True

    async def get_by_ticker(self, ticker: str) -> Optional[Favorite]:
        result = await self.db.execute(
            select(Favorite).where(Favorite.ticker == ticker)
        )
        return result.scalar_one_or_none()

    async def is_favorite(self, ticker: str) -> bool:
        fav = await self.get_by_ticker(ticker)
        return fav is not None
