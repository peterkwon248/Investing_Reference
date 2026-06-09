import json
from typing import Optional, Any
from app.db.database import get_redis


class CacheService:
    PREFIX = "invest_calc:"

    @classmethod
    async def get(cls, key: str) -> Optional[Any]:
        redis = await get_redis()
        if not redis:
            return None
        try:
            data = await redis.get(f"{cls.PREFIX}{key}")
            if data:
                return json.loads(data)
        except Exception:
            pass
        return None

    @classmethod
    async def set(cls, key: str, value: Any, ttl: int = 300):
        redis = await get_redis()
        if not redis:
            return
        try:
            await redis.set(
                f"{cls.PREFIX}{key}",
                json.dumps(value, default=str),
                ex=ttl,
            )
        except Exception:
            pass

    @classmethod
    async def delete(cls, key: str):
        redis = await get_redis()
        if not redis:
            return
        try:
            await redis.delete(f"{cls.PREFIX}{key}")
        except Exception:
            pass

    @classmethod
    async def delete_pattern(cls, pattern: str):
        redis = await get_redis()
        if not redis:
            return
        try:
            keys = []
            async for key in redis.scan_iter(f"{cls.PREFIX}{pattern}"):
                keys.append(key)
            if keys:
                await redis.delete(*keys)
        except Exception:
            pass
