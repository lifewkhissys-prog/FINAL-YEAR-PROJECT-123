from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.migrations import apply_migrations
from app.seed import seed_database
from app.utils.errors import register_error_handlers
from app.routers import thesis, auth

@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.SECRET_KEY == "devlabsecretkeychangeinproduction12345":
        import os
        if os.getenv("ENV", "development").lower() == "production":
            raise RuntimeError("SECRET_KEY must be changed from the default value in production environment.")

    try:
        from app.database import init_pgvector
        await init_pgvector()
    except Exception as e:
        print(f"pgvector init warning: {e}")

    await apply_migrations()

    # Automatically seed official KNUST rubric data
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

import os
origins = [
    "http://localhost:5173", "http://localhost:3000", "http://localhost:4173",
    "http://127.0.0.1:5173", "http://127.0.0.1:3000", "http://127.0.0.1:4173"
]
env_cors = os.getenv("CORS_ORIGINS", "")
if env_cors:
    origins.extend([o.strip() for o in env_cors.split(",") if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if not (env_cors and env_cors.strip() == "*") else ["*"],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True if not (env_cors and env_cors.strip() == "*") else False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register custom global error handlers
register_error_handlers(app)

# Include Routers for Thesis Assessor
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(thesis.router)

@app.api_route("/health", methods=["GET", "HEAD"])
@app.api_route("/api/health", methods=["GET", "HEAD"])
def health_check():
    return {"status": "ok"}




