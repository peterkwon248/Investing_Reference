from fastapi import APIRouter
from app.api.v1.stocks import router as stocks_router
from app.api.v1.backtests import router as backtests_router
from app.api.v1.portfolios import router as portfolios_router
from app.api.v1.favorites import router as favorites_router

api_router = APIRouter()
api_router.include_router(stocks_router)
api_router.include_router(backtests_router)
api_router.include_router(portfolios_router)
api_router.include_router(favorites_router)

