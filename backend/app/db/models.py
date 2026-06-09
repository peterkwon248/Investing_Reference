"""ORM 모델 정의

기존 JSON/SQLite 저장소를 PostgreSQL로 마이그레이션
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime,
    Text, ForeignKey, JSON, Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
from app.db.database import Base


class Portfolio(Base):
    __tablename__ = "portfolios"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, default="")
    currency = Column(String(3), default="USD")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    positions = relationship("Position", back_populates="portfolio", cascade="all, delete-orphan")
    trade_history = relationship("TradeHistory", back_populates="portfolio", cascade="all, delete-orphan")
    fund_history = relationship("FundHistory", back_populates="portfolio", cascade="all, delete-orphan")


class Position(Base):
    __tablename__ = "positions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id", ondelete="CASCADE"), nullable=False)
    ticker = Column(String(20), nullable=False)
    name = Column(String(200), default="")
    strategy = Column(String(50), nullable=False)  # infinite_buy, value_rebalance, dca, etc.
    shares = Column(Float, default=0)
    avg_price = Column(Float, default=0)
    allocated_capital = Column(Float, default=0)
    params = Column(JSONB, default={})  # 전략별 파라미터
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    portfolio = relationship("Portfolio", back_populates="positions")

    __table_args__ = (
        Index("ix_positions_portfolio_ticker", "portfolio_id", "ticker"),
    )


class TradeHistory(Base):
    __tablename__ = "trade_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id", ondelete="CASCADE"), nullable=False)
    ticker = Column(String(20), nullable=False)
    action = Column(String(10), nullable=False)  # buy, sell
    price = Column(Float, nullable=False)
    shares = Column(Float, nullable=False)
    amount = Column(Float, nullable=False)
    commission = Column(Float, default=0)
    reason = Column(String(200), default="")
    traded_at = Column(DateTime, default=datetime.utcnow)

    portfolio = relationship("Portfolio", back_populates="trade_history")

    __table_args__ = (
        Index("ix_trade_history_portfolio_date", "portfolio_id", "traded_at"),
    )


class FundHistory(Base):
    __tablename__ = "fund_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id", ondelete="CASCADE"), nullable=False)
    action = Column(String(10), nullable=False)  # deposit, withdraw
    amount = Column(Float, nullable=False)
    note = Column(String(200), default="")
    recorded_at = Column(DateTime, default=datetime.utcnow)

    portfolio = relationship("Portfolio", back_populates="fund_history")


class BacktestResultDB(Base):
    __tablename__ = "backtest_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ticker = Column(String(20), nullable=False, index=True)
    strategy_name = Column(String(50), nullable=False)
    strategy_type = Column(String(30), nullable=False)
    period = Column(String(10), default="1y")
    initial_capital = Column(Float, nullable=False)
    final_value = Column(Float, nullable=False)
    total_return = Column(Float, nullable=False)
    net_return = Column(Float, nullable=False)
    metrics = Column(JSONB, default={})
    config = Column(JSONB, default={})
    history_summary = Column(JSONB, default={})  # 축약된 히스토리
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_backtest_results_ticker_strategy", "ticker", "strategy_type"),
    )


class Favorite(Base):
    __tablename__ = "favorites"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ticker = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(200), default="")
    market = Column(String(5), default="US")
    added_at = Column(DateTime, default=datetime.utcnow)


class PriceCache(Base):
    __tablename__ = "price_cache"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ticker = Column(String(20), nullable=False, index=True)
    price = Column(Float, nullable=False)
    change = Column(Float, default=0)
    change_percent = Column(Float, default=0)
    volume = Column(Float, default=0)
    data = Column(JSONB, default={})
    cached_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_price_cache_ticker_date", "ticker", "cached_at"),
    )
