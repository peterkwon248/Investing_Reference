from fastapi import APIRouter
from app.services.backtest_service import BacktestService
from app.schemas.backtest import (
    InfiniteBuyRequest, DCARequest, BuyAndHoldRequest,
    ValueRebalanceRequest, CompareRequest
)

router = APIRouter(prefix="/backtests", tags=["backtests"])
service = BacktestService()


@router.post("/infinite-buy")
async def run_infinite_buy(request: InfiniteBuyRequest):
    return await service.run_infinite_buy(request)


@router.post("/dca")
async def run_dca(request: DCARequest):
    return await service.run_dca(request)


@router.post("/buy-and-hold")
async def run_buy_and_hold(request: BuyAndHoldRequest):
    return await service.run_buy_and_hold(request)


@router.post("/value-rebalance")
async def run_value_rebalance(request: ValueRebalanceRequest):
    return await service.run_value_rebalance(request)


@router.post("/compare")
async def compare_strategies(request: CompareRequest):
    return await service.run_compare(request)


@router.get("/presets")
async def get_presets():
    return {
        "presets": [
            {"key": "비용 없음 (이론)", "label": "비용 없음 (이론)", "description": "수수료/세금 없이 이론적 백테스트"},
            {"key": "미국 주식 (기본)", "label": "미국 주식 (기본)", "description": "무료 수수료 + 환전 0.5% + 양도세 22%"},
            {"key": "미국 주식 (현실적)", "label": "미국 주식 (현실적)", "description": "슬리피지 0.1% + 환전 1%"},
            {"key": "한국 주식", "label": "한국 주식", "description": "수수료 0.015% + 배당세 15.4%"},
            {"key": "암호화폐", "label": "암호화폐", "description": "수수료 0.1% + 슬리피지 0.2%"},
        ]
    }
