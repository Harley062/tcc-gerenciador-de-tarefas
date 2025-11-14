import hashlib
import json
from datetime import datetime, timedelta
from typing import Any, Optional

import redis.asyncio as redis


class RedisCache:
    def __init__(self, redis_url: str):
        self.redis_client = redis.from_url(redis_url, decode_responses=True)
        self.default_ttl = 3600

    async def get(self, key: str) -> Optional[dict[str, Any]]:
        value = await self.redis_client.get(key)
        if value:
            await self.redis_client.expire(key, self.default_ttl)
            return json.loads(value)
        return None

    async def set(self, key: str, value: dict[str, Any], ttl: Optional[int] = None) -> None:
        ttl = ttl or self.default_ttl
        await self.redis_client.setex(key, ttl, json.dumps(value))

    async def delete(self, key: str) -> None:
        await self.redis_client.delete(key)

    async def get_stats(self) -> dict[str, Any]:
        info = await self.redis_client.info("stats")
        return {
            "keyspace_hits": info.get("keyspace_hits", 0),
            "keyspace_misses": info.get("keyspace_misses", 0),
            "hit_rate": self._calculate_hit_rate(
                info.get("keyspace_hits", 0), info.get("keyspace_misses", 0)
            ),
        }

    def _calculate_hit_rate(self, hits: int, misses: int) -> float:
        total = hits + misses
        return (hits / total * 100) if total > 0 else 0.0

    @staticmethod
    def generate_hash(text: str) -> str:
        return hashlib.md5(text.encode()).hexdigest()

    async def close(self) -> None:
        await self.redis_client.close()
