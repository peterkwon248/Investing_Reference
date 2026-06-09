from enum import Enum


class StrategyType(Enum):
    """전략 유형"""
    INFINITE_BUY = "infinite_buy"
    VALUE_REBALANCE = "value_rebalance"
    DCA = "dca"
    BUY_AND_HOLD = "buy_and_hold"
    LUMP_SUM = "lump_sum"
