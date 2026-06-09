from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.services.favorite_service import FavoriteService
from app.services.stock_service import StockService
from app.schemas.portfolio import FavoriteCreate, FavoriteResponse

router = APIRouter(prefix="/favorites", tags=["favorites"])


@router.get("", response_model=List[FavoriteResponse])
async def list_favorites(db: AsyncSession = Depends(get_db)):
    service = FavoriteService(db)
    stock_service = StockService()
    favorites = await service.list_all()
    results = []
    for fav in favorites:
        current_price = None
        change = None
        change_percent = None
        try:
            price_data = await stock_service.get_price(fav.ticker)
            if price_data:
                current_price = price_data.get("price")
                change = price_data.get("change")
                change_percent = price_data.get("change_percent")
        except Exception:
            pass
        results.append(
            FavoriteResponse(
                id=fav.id,
                ticker=fav.ticker,
                name=fav.name or "",
                market=fav.market or "US",
                current_price=current_price,
                change=change,
                change_percent=change_percent,
                added_at=fav.added_at,
            )
        )
    return results


@router.post("", response_model=FavoriteResponse, status_code=201)
async def add_favorite(
    data: FavoriteCreate, db: AsyncSession = Depends(get_db)
):
    service = FavoriteService(db)
    favorite = await service.add(
        ticker=data.ticker, name=data.name, market=data.market
    )
    return FavoriteResponse(
        id=favorite.id,
        ticker=favorite.ticker,
        name=favorite.name or "",
        market=favorite.market or "US",
        added_at=favorite.added_at,
    )


@router.delete("/{ticker}", status_code=204)
async def remove_favorite(ticker: str, db: AsyncSession = Depends(get_db)):
    service = FavoriteService(db)
    removed = await service.remove(ticker)
    if not removed:
        raise HTTPException(status_code=404, detail="Favorite not found")


@router.get("/{ticker}/check")
async def check_favorite(ticker: str, db: AsyncSession = Depends(get_db)):
    service = FavoriteService(db)
    is_fav = await service.is_favorite(ticker)
    return {"ticker": ticker, "is_favorite": is_fav}
