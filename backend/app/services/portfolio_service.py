from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import Portfolio, Position, TradeHistory, FundHistory


class PortfolioService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_all(self) -> List[Portfolio]:
        result = await self.db.execute(
            select(Portfolio)
            .options(selectinload(Portfolio.positions))
            .order_by(Portfolio.updated_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_id(self, portfolio_id: int) -> Optional[Portfolio]:
        result = await self.db.execute(
            select(Portfolio)
            .options(
                selectinload(Portfolio.positions),
                selectinload(Portfolio.trade_history),
                selectinload(Portfolio.fund_history),
            )
            .where(Portfolio.id == portfolio_id)
        )
        return result.scalar_one_or_none()

    async def get_by_name(self, name: str) -> Optional[Portfolio]:
        result = await self.db.execute(
            select(Portfolio)
            .options(selectinload(Portfolio.positions))
            .where(Portfolio.name == name)
        )
        return result.scalar_one_or_none()

    async def create(
        self, name: str, description: str = "", currency: str = "USD"
    ) -> Portfolio:
        portfolio = Portfolio(name=name, description=description, currency=currency)
        self.db.add(portfolio)
        await self.db.flush()
        await self.db.refresh(portfolio)
        return portfolio

    async def update(self, portfolio_id: int, **kwargs) -> Optional[Portfolio]:
        portfolio = await self.get_by_id(portfolio_id)
        if not portfolio:
            return None
        for key, value in kwargs.items():
            if value is not None and hasattr(portfolio, key):
                setattr(portfolio, key, value)
        await self.db.flush()
        await self.db.refresh(portfolio)
        return portfolio

    async def delete(self, portfolio_id: int) -> bool:
        portfolio = await self.get_by_id(portfolio_id)
        if not portfolio:
            return False
        await self.db.delete(portfolio)
        await self.db.flush()
        return True

    async def add_position(
        self,
        portfolio_id: int,
        ticker: str,
        name: str = "",
        strategy: str = "infinite_buy",
        shares: float = 0,
        avg_price: float = 0,
        allocated_capital: float = 0,
        params: dict = None,
    ) -> Optional[Position]:
        portfolio = await self.get_by_id(portfolio_id)
        if not portfolio:
            return None
        position = Position(
            portfolio_id=portfolio_id,
            ticker=ticker,
            name=name,
            strategy=strategy,
            shares=shares,
            avg_price=avg_price,
            allocated_capital=allocated_capital,
            params=params or {},
        )
        self.db.add(position)
        await self.db.flush()
        await self.db.refresh(position)
        return position

    async def remove_position(self, position_id: int) -> bool:
        result = await self.db.execute(
            select(Position).where(Position.id == position_id)
        )
        position = result.scalar_one_or_none()
        if not position:
            return False
        await self.db.delete(position)
        await self.db.flush()
        return True

    async def add_trade(
        self,
        portfolio_id: int,
        ticker: str,
        action: str,
        price: float,
        shares: float,
        amount: float,
        commission: float = 0,
        reason: str = "",
    ) -> TradeHistory:
        trade = TradeHistory(
            portfolio_id=portfolio_id,
            ticker=ticker,
            action=action,
            price=price,
            shares=shares,
            amount=amount,
            commission=commission,
            reason=reason,
        )
        self.db.add(trade)
        await self.db.flush()
        await self.db.refresh(trade)
        return trade

    async def add_fund(
        self,
        portfolio_id: int,
        action: str,
        amount: float,
        note: str = "",
    ) -> FundHistory:
        fund = FundHistory(
            portfolio_id=portfolio_id,
            action=action,
            amount=amount,
            note=note,
        )
        self.db.add(fund)
        await self.db.flush()
        await self.db.refresh(fund)
        return fund
