from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


_engine = None
_session_factory = None
_redis = None


def get_engine():
    global _engine
    if _engine is None:
        try:
            from sqlalchemy.ext.asyncio import create_async_engine
            from app.config import get_settings
            settings = get_settings()
            _engine = create_async_engine(
                settings.database_url,
                echo=settings.debug,
                pool_size=20,
                max_overflow=10,
            )
        except Exception as e:
            print(f"[DB] Engine creation failed: {e}")
    return _engine


def get_session_factory():
    global _session_factory
    if _session_factory is None:
        engine = get_engine()
        if engine:
            from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
            _session_factory = async_sessionmaker(
                engine,
                class_=AsyncSession,
                expire_on_commit=False,
            )
    return _session_factory


async def init_db():
    """Create all tables on startup"""
    engine = get_engine()
    if engine:
        async with engine.begin() as conn:
            from app.db.models import (
                Portfolio, Position, TradeHistory, FundHistory,
                BacktestResultDB, Favorite, PriceCache
            )
            await conn.run_sync(Base.metadata.create_all)
        print("[DB] Tables created successfully")


async def get_redis():
    global _redis
    if _redis is None:
        try:
            import redis.asyncio as aioredis
            from app.config import get_settings
            settings = get_settings()
            _redis = aioredis.from_url(settings.redis_url, decode_responses=True)
            await _redis.ping()
            print("[REDIS] Connected successfully")
        except Exception as e:
            print(f"[REDIS] Connection failed: {e}")
            _redis = None
    return _redis


async def close_db():
    global _engine, _redis
    if _engine:
        await _engine.dispose()
        _engine = None
        print("[DB] Engine disposed")
    if _redis:
        await _redis.close()
        _redis = None
        print("[REDIS] Connection closed")
