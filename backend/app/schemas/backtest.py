from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class BacktestConfigSchema(BaseModel):
    buy_commission: float = 0.0
    sell_commission: float = 0.0
    slippage: float = 0.0
    fx_spread: float = 0.0
    capital_gains_tax: float = 0.0
    dividend_tax: float = 0.0
    allow_fractional: bool = True
    preset: Optional[str] = None


class InfiniteBuyRequest(BaseModel):
    ticker: str
    capital: float
    divisions: int = 40
    target_profit: float = 10.0
    period: str = "1y"
    config: BacktestConfigSchema = BacktestConfigSchema()


class DCARequest(BaseModel):
    ticker: str
    capital: float
    periodic_amount: float
    interval: int = 21
    initial_lump: float = 0
    period: str = "1y"
    config: BacktestConfigSchema = BacktestConfigSchema()


class BuyAndHoldRequest(BaseModel):
    ticker: str
    capital: float
    period: str = "1y"
    config: BacktestConfigSchema = BacktestConfigSchema()


class ValueRebalanceRequest(BaseModel):
    ticker: str
    capital: float
    upper_band: float = 1.15
    lower_band: float = 0.85
    annual_growth: float = 0.15
    pool_limit: float = 0.25
    period: str = "1y"
    config: BacktestConfigSchema = BacktestConfigSchema()


class CompareRequest(BaseModel):
    ticker: str
    capital: float
    period: str = "1y"
    strategies: List[str] = ["infinite_buy", "dca", "buy_and_hold", "value_rebalance"]
    config: BacktestConfigSchema = BacktestConfigSchema()


class BacktestResultSchema(BaseModel):
    strategy_name: str
    strategy_type: str
    initial_capital: float
    final_value: float
    total_return: float
    total_return_amount: float
    total_cost: float
    net_return: float
    metrics: Dict[str, Any]
    history: List[Dict[str, Any]]
    trade_count: int
