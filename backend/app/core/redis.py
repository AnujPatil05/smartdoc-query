# backend/app/core/redis.py
import redis.asyncio as redis
from app.core.config import settings

redis_client: redis.Redis = None

async def init_redis() -> None:
    """Initialize the global Redis client."""
    global redis_client

    # Create async Redis client from REDIS_URL env
    redis_client = redis.from_url(
        settings.REDIS_URL,
        decode_responses=True,
    )

    # Simple connectivity check
    await redis_client.ping()
    print("✅ Redis connected (from init_redis)")

async def get_redis():
    """Dependency for Redis client"""
    return redis_client


async def close_redis() -> None:
    """Cleanly close Redis connection on shutdown."""
    global redis_client

    if redis_client is not None:
        await redis_client.close()
        redis_client = None
        print("👋 Redis connection closed")