from dataclasses import dataclass, field
from typing import List, Dict, Optional
from app.core.enums import StrategyType


@dataclass
class BacktestConfig:
    """백테스트 설정"""
    buy_commission: float = 0.0
    sell_commission: float = 0.0
    slippage: float = 0.0
    fx_spread: float = 0.0
    capital_gains_tax: float = 0.0
    dividend_tax: float = 0.0
    min_trade_unit: float = 0.0001
    allow_fractional: bool = True

    @classmethod
    def zero_cost(cls) -> 'BacktestConfig':
        return cls()

    @classmethod
    def us_stock_basic(cls) -> 'BacktestConfig':
        return cls(
            buy_commission=0.0, sell_commission=0.0,
            slippage=0.05, fx_spread=0.5,
            capital_gains_tax=22.0, dividend_tax=15.0
        )

    @classmethod
    def us_stock_realistic(cls) -> 'BacktestConfig':
        return cls(
            buy_commission=0.0, sell_commission=0.0,
            slippage=0.1, fx_spread=1.0,
            capital_gains_tax=22.0, dividend_tax=15.0
        )

    @classmethod
    def kr_stock_basic(cls) -> 'BacktestConfig':
        return cls(
            buy_commission=0.015, sell_commission=0.015,
            slippage=0.05, capital_gains_tax=0.0,
            dividend_tax=15.4
        )

    @classmethod
    def crypto_basic(cls) -> 'BacktestConfig':
        return cls(
            buy_commission=0.1, sell_commission=0.1,
            slippage=0.2, capital_gains_tax=22.0
        )


@dataclass
class TradeRecord:
    """거래 기록"""
    day: int
    date: Optional[str]
    action: str
    price: float
    shares: float
    amount: float
    commission: float
    slippage_cost: float
    net_amount: float
    reason: str = ""


@dataclass
class BacktestResult:
    """백테스트 결과"""
    strategy_name: str
    strategy_type: StrategyType
    config: BacktestConfig
    initial_capital: float
    final_value: float
    total_return: float
    total_return_amount: float
    total_commission: float
    total_slippage: float
    total_tax: float
    total_cost: float
    net_return: float
    history: List[Dict]
    trades: List[TradeRecord]
    metrics: Dict[str, float] = field(default_factory=dict)


BACKTEST_PRESETS = {
    '비용 없음 (이론)': BacktestConfig.zero_cost(),
    '미국 주식 (기본)': BacktestConfig.us_stock_basic(),
    '미국 주식 (현실적)': BacktestConfig.us_stock_realistic(),
    '한국 주식': BacktestConfig.kr_stock_basic(),
    '암호화폐': BacktestConfig.crypto_basic(),
}
