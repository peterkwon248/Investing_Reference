from typing import AsyncGenerator
from app.config import get_settings


async def get_db() -> AsyncGenerator:
    from app.db.database import get_session_factory
    factory = get_session_factory()
    if factory is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=503, detail="Database not available")
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


def get_settings_dep():
    return get_settings()
