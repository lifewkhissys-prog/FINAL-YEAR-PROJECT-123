from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.migrations import apply_migrations
from app.seed import seed_database, RUBRIC_SETS
from app.utils.errors import register_error_handlers
from app.routers import thesis, auth, courses, assessments, problems, dashboard, submissions

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

# Standard Starlette CORSMiddleware configuration with explicit origin allowlist
origins = ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:3000"]
if hasattr(settings, "CORS_ORIGINS") and settings.CORS_ORIGINS:
    origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register custom global error handlers
register_error_handlers(app)

# Include Routers
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(courses.router, prefix="/api/courses", tags=["Courses"])
app.include_router(assessments.router, prefix="/api/assessments", tags=["Assessments"])
app.include_router(problems.router, prefix="/api/problems", tags=["Problems"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(thesis.router)
app.include_router(submissions.router, prefix="/api/submissions", tags=["Submissions"])

@app.get("/health")
def health_check():
    return {"status": "ok"}

