from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.services.portfolio_service import PortfolioService
from app.services.stock_service import StockService
from app.schemas.portfolio import (
    PortfolioCreate,
    PortfolioUpdate,
    PortfolioSummary,
    PortfolioDetail,
    PositionCreate,
    PositionResponse,
    TradeCreate,
    TradeResponse,
    FundCreate,
    FundResponse,
)

router = APIRouter(prefix="/portfolios", tags=["portfolios"])


@router.get("", response_model=List[PortfolioSummary])
async def list_portfolios(db: AsyncSession = Depends(get_db)):
    service = PortfolioService(db)
    portfolios = await service.list_all()
    results = []
    for p in portfolios:
        total_invested = sum(pos.allocated_capital for pos in p.positions)
        results.append(
            PortfolioSummary(
                id=p.id,
                name=p.name,
                description=p.description or "",
                currency=p.currency,
                position_count=len(p.positions),
                total_invested=total_invested,
                total_value=total_invested,
                total_profit_loss=0,
                total_profit_loss_percent=0,
                created_at=p.created_at,
                updated_at=p.updated_at,
            )
        )
    return results


@router.post("", response_model=PortfolioSummary, status_code=201)
async def create_portfolio(
    data: PortfolioCreate, db: AsyncSession = Depends(get_db)
):
    service = PortfolioService(db)
    existing = await service.get_by_name(data.name)
    if existing:
        raise HTTPException(
            status_code=409, detail="Portfolio with this name already exists"
        )
    portfolio = await service.create(
        name=data.name, description=data.description, currency=data.currency
    )
    return PortfolioSummary(
        id=portfolio.id,
        name=portfolio.name,
        description=portfolio.description or "",
        currency=portfolio.currency,
        position_count=0,
        total_invested=0,
        total_value=0,
        total_profit_loss=0,
        total_profit_loss_percent=0,
        created_at=portfolio.created_at,
        updated_at=portfolio.updated_at,
    )


@router.get("/{portfolio_id}", response_model=PortfolioDetail)
async def get_portfolio(portfolio_id: int, db: AsyncSession = Depends(get_db)):
    service = PortfolioService(db)
    stock_service = StockService()
    portfolio = await service.get_by_id(portfolio_id)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    positions = []
    total_invested = 0
    total_value = 0
    for pos in portfolio.positions:
        current_price = None
        current_value = None
        profit_loss = None
        profit_loss_percent = None
        try:
            price_data = await stock_service.get_price(pos.ticker)
            if price_data:
                current_price = price_data.get("price", 0)
                current_value = current_price * pos.shares
                invested = pos.avg_price * pos.shares
                profit_loss = current_value - invested
                profit_loss_percent = (
                    (profit_loss / invested * 100) if invested > 0 else 0
                )
                total_value += current_value
        except Exception:
            pass
        total_invested += pos.allocated_capital
        positions.append(
            PositionResponse(
                id=pos.id,
                ticker=pos.ticker,
                name=pos.name or "",
                strategy=pos.strategy,
                shares=pos.shares,
                avg_price=pos.avg_price,
                allocated_capital=pos.allocated_capital,
                current_price=current_price,
                current_value=current_value,
                profit_loss=profit_loss,
                profit_loss_percent=profit_loss_percent,
                params=pos.params or {},
            )
        )

    if total_value == 0:
        total_value = total_invested

    return PortfolioDetail(
        id=portfolio.id,
        name=portfolio.name,
        description=portfolio.description or "",
        currency=portfolio.currency,
        position_count=len(positions),
        total_invested=total_invested,
        total_value=total_value,
        total_profit_loss=total_value - total_invested,
        total_profit_loss_percent=(
            ((total_value - total_invested) / total_invested * 100)
            if total_invested > 0
            else 0
        ),
        created_at=portfolio.created_at,
        updated_at=portfolio.updated_at,
        positions=positions,
    )


@router.put("/{portfolio_id}", response_model=PortfolioSummary)
async def update_portfolio(
    portfolio_id: int,
    data: PortfolioUpdate,
    db: AsyncSession = Depends(get_db),
):
    service = PortfolioService(db)
    updates = data.model_dump(exclude_unset=True)
    portfolio = await service.update(portfolio_id, **updates)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    total_invested = sum(pos.allocated_capital for pos in portfolio.positions)
    return PortfolioSummary(
        id=portfolio.id,
        name=portfolio.name,
        description=portfolio.description or "",
        currency=portfolio.currency,
        position_count=len(portfolio.positions),
        total_invested=total_invested,
        total_value=total_invested,
        total_profit_loss=0,
        total_profit_loss_percent=0,
        created_at=portfolio.created_at,
        updated_at=portfolio.updated_at,
    )


@router.delete("/{portfolio_id}", status_code=204)
async def delete_portfolio(portfolio_id: int, db: AsyncSession = Depends(get_db)):
    service = PortfolioService(db)
    deleted = await service.delete(portfolio_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Portfolio not found")


@router.post(
    "/{portfolio_id}/positions", response_model=PositionResponse, status_code=201
)
async def add_position(
    portfolio_id: int,
    data: PositionCreate,
    db: AsyncSession = Depends(get_db),
):
    service = PortfolioService(db)
    position = await service.add_position(
        portfolio_id=portfolio_id,
        ticker=data.ticker,
        name=data.name,
        strategy=data.strategy,
        shares=data.shares,
        avg_price=data.avg_price,
        allocated_capital=data.allocated_capital,
        params=data.params,
    )
    if not position:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return PositionResponse(
        id=position.id,
        ticker=position.ticker,
        name=position.name or "",
        strategy=position.strategy,
        shares=position.shares,
        avg_price=position.avg_price,
        allocated_capital=position.allocated_capital,
        params=position.params or {},
    )


@router.delete("/{portfolio_id}/positions/{position_id}", status_code=204)
async def remove_position(
    portfolio_id: int, position_id: int, db: AsyncSession = Depends(get_db)
):
    service = PortfolioService(db)
    removed = await service.remove_position(position_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Position not found")


@router.post(
    "/{portfolio_id}/trades", response_model=TradeResponse, status_code=201
)
async def add_trade(
    portfolio_id: int,
    data: TradeCreate,
    db: AsyncSession = Depends(get_db),
):
    service = PortfolioService(db)
    trade = await service.add_trade(
        portfolio_id=portfolio_id,
        ticker=data.ticker,
        action=data.action,
        price=data.price,
        shares=data.shares,
        amount=data.amount,
        commission=data.commission,
        reason=data.reason,
    )
    return TradeResponse.model_validate(trade)


@router.get("/{portfolio_id}/trades", response_model=List[TradeResponse])
async def list_trades(portfolio_id: int, db: AsyncSession = Depends(get_db)):
    service = PortfolioService(db)
    portfolio = await service.get_by_id(portfolio_id)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return [TradeResponse.model_validate(t) for t in portfolio.trade_history]


@router.post(
    "/{portfolio_id}/funds", response_model=FundResponse, status_code=201
)
async def add_fund(
    portfolio_id: int,
    data: FundCreate,
    db: AsyncSession = Depends(get_db),
):
    service = PortfolioService(db)
    fund = await service.add_fund(
        portfolio_id=portfolio_id,
        action=data.action,
        amount=data.amount,
        note=data.note,
    )
    return FundResponse.model_validate(fund)
