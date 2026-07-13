from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

# Create asynchronous engine
# PostgreSQL connection URL starts with postgresql+asyncpg://
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
    pool_pre_ping=True
)

# Async session factory
SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

# Declarative base class for models
class Base(DeclarativeBase):
    pass

# Dependency to get db session in path operations
async def get_db():
    async with SessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
