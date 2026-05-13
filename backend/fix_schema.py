"""Compatibility wrapper for older deploys.

The main schema initializer is now idempotent, so this script simply runs it.
"""
import asyncio

from app.core.database import init_db


if __name__ == "__main__":
    asyncio.run(init_db())
    print("Schema fixes applied.")
