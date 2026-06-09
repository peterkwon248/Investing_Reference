from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class PositionCreate(BaseModel):
    ticker: str
    name: str = ""
    strategy: str = "infinite_buy"
    shares: float = 0
    avg_price: float = 0
    allocated_capital: float = 0
    params: dict = {}


class PositionResponse(BaseModel):
    id: int
    ticker: str
    name: str
    strategy: str
    shares: float
    avg_price: float
    allocated_capital: float
    current_price: Optional[float] = None
    current_value: Optional[float] = None
    profit_loss: Optional[float] = None
    profit_loss_percent: Optional[float] = None
    params: dict = {}

    model_config = {"from_attributes": True}


class PortfolioCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str = ""
    currency: str = "USD"


class PortfolioUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    currency: Optional[str] = None


class PortfolioSummary(BaseModel):
    id: int
    name: str
    description: str
    currency: str
    position_count: int = 0
    total_invested: float = 0
    total_value: float = 0
    total_profit_loss: float = 0
    total_profit_loss_percent: float = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PortfolioDetail(PortfolioSummary):
    positions: List[PositionResponse] = []


class TradeCreate(BaseModel):
    ticker: str
    action: str  # buy, sell
    price: float
    shares: float
    amount: float
    commission: float = 0
    reason: str = ""


class TradeResponse(BaseModel):
    id: int
    ticker: str
    action: str
    price: float
    shares: float
    amount: float
    commission: float
    reason: str
    traded_at: datetime

    model_config = {"from_attributes": True}


class FundCreate(BaseModel):
    action: str  # deposit, withdraw
    amount: float
    note: str = ""


class FundResponse(BaseModel):
    id: int
    action: str
    amount: float
    note: str
    recorded_at: datetime

    model_config = {"from_attributes": True}


class FavoriteCreate(BaseModel):
    ticker: str
    name: str = ""
    market: str = "US"


class FavoriteResponse(BaseModel):
    id: int
    ticker: str
    name: str
    market: str
    current_price: Optional[float] = None
    change: Optional[float] = None
    change_percent: Optional[float] = None
    added_at: datetime

    model_config = {"from_attributes": True}
