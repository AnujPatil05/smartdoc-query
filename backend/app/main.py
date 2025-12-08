# app/main.py
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import uvicorn
from typing import Optional, List
import time

from app.core.config import settings
from app.core.database import database, init_db
from app.core import redis as redis_core
from app.api import documents, queries, conversations
from app.middleware.rate_limit import RateLimitMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    await init_db()
    await redis_core.init_redis()
    await database.connect()
    print("✅ Database connected")
    print("✅ Redis connected")
    
    yield
    
    # Shutdown
    await database.disconnect()
    await redis_core.close_redis()
    print("👋 Shutting down...")


app = FastAPI(
    title="SmartDoc Query System",
    description="AI-powered document intelligence platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate Limiting Middleware
#app.add_middleware(RateLimitMiddleware)

# Include routers
app.include_router(documents.router, prefix="/api/v1", tags=["documents"])
app.include_router(queries.router, prefix="/api/v1", tags=["queries"])
app.include_router(conversations.router, prefix="/api/v1", tags=["conversations"])

@app.get("/")
async def root():
    return {
        "name": "SmartDoc Query System",
        "version": "1.0.0",
        "status": "operational"
    }
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    # Database
    try:
        await database.fetch_one("SELECT 1")
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
    
    # Redis
    try:
        if redis_core.redis_client is not None:
            await redis_core.redis_client.ping()
            redis_status = "healthy"
        else:
            redis_status = "unhealthy: not connected"
    except Exception as e:
        redis_status = f"unhealthy: {str(e)}"
    
    return {
        "status": "healthy" if db_status == "healthy" and redis_status == "healthy" else "degraded",
        "database": db_status,
        "redis": redis_status,
        "timestamp": time.time()
    }

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True
    )