"""Initialize or upgrade the SmartDoc database schema."""
import asyncio

from app.core.database import init_db


async def main() -> None:
    await init_db()
    print("Database setup complete.")


if __name__ == "__main__":
    asyncio.run(main())
