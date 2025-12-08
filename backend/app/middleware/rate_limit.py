# backend/app/middleware/rate_limit.py
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
import time

from app.core.redis import redis_client

class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Define rate limits
        limits = {
            '/api/v1/upload': (5, 3600),      # 5 uploads per hour
            '/api/v1/query': (20, 60),        # 20 queries per minute
        }
        
        path = request.url.path
        if path in limits:
            client_ip = request.client.host
            max_requests, window = limits[path]
            
            allowed = await self.check_rate_limit(
                client_ip, path, max_requests, window
            )
            
            if not allowed:
                raise HTTPException(
                    429,
                    f"Rate limit exceeded. Max {max_requests} requests per {window}s"
                )
        
        response = await call_next(request)
        return response
    
    async def check_rate_limit(
        self, identifier: str, endpoint: str, max_requests: int, window: int
    ) -> bool:
        """Check if request is within rate limit"""
        key = f"rate_limit:{endpoint}:{identifier}"
        current_time = int(time.time())
        window_start = current_time - window
        
        pipe = redis_client.pipeline()
        pipe.zremrangebyscore(key, 0, window_start)
        pipe.zcard(key)
        pipe.zadd(key, {str(current_time): current_time})
        pipe.expire(key, window)
        
        results = await pipe.execute()
        request_count = results[1]
        
        return request_count < max_requests