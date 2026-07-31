from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.database import Base, engine
from app.seed import seed_database
from app.utils.errors import register_error_handlers
from app.routers import thesis

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        from app.database import init_pgvector
        await init_pgvector()
    except Exception as e:
        print(f"pgvector init warning: {e}")
        
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        try:
            await conn.execute(text("ALTER TABLE thesis_submissions ADD COLUMN pipeline_step VARCHAR(100)"))
        except Exception:
            pass
        try:
            await conn.execute(text("ALTER TABLE thesis_submissions ADD COLUMN pipeline_progress INTEGER"))
        except Exception:
            pass
    
    # Automatically seed official KNUST rubric data if database is empty
    try:
        await seed_database()
    except Exception as e:
        print(f"Database seed warning: {e}")
        
    yield

app = FastAPI(
    title="Evidence-Based Thesis Assessor API",
    version="1.0.0",
    lifespan=lifespan
)

# Standard Starlette CORSMiddleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register custom global error handlers
register_error_handlers(app)

# Include Routers
app.include_router(thesis.router)

@app.get("/health")
def health_check():
    return {"status": "ok"}
