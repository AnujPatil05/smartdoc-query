import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.core.config import settings
from app.core.redis import get_redis


def _parse_limit(value: str) -> tuple[int, int]:
    count, window_name = value.split("/", 1)
    windows = {
        "second": 1,
        "minute": 60,
        "hour": 3600,
        "day": 86400,
    }
    return int(count), windows.get(window_name.rstrip("s"), 60)


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        limits = {
            "/api/v1/upload": _parse_limit(settings.RATE_LIMIT_UPLOAD),
            "/api/v1/query": _parse_limit(settings.RATE_LIMIT_QUERY),
        }

        path = request.url.path
        if path in limits:
            max_requests, window = limits[path]
            allowed = await self.check_rate_limit(
                request.client.host if request.client else "unknown",
                path,
                max_requests,
                window,
            )

            if not allowed:
                return JSONResponse(
                    {"detail": f"Rate limit exceeded. Max {max_requests} requests per {window}s"},
                    status_code=429,
                )

        return await call_next(request)

    async def check_rate_limit(
        self,
        identifier: str,
        endpoint: str,
        max_requests: int,
        window: int,
    ) -> bool:
        """Check if a request is within the configured rate limit."""
        redis_client = await get_redis()
        if redis_client is None:
            return True

        key = f"rate_limit:{endpoint}:{identifier}"
        current_time = time.time()
        window_start = current_time - window

        pipe = redis_client.pipeline()
        pipe.zremrangebyscore(key, 0, window_start)
        pipe.zcard(key)
        pipe.zadd(key, {f"{current_time}:{uuid.uuid4()}": current_time})
        pipe.expire(key, window)

        results = await pipe.execute()
        request_count = results[1]
        return request_count < max_requests
