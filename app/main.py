from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine, init_pgvector
from app.utils.errors import register_error_handlers
from app.routers import auth, courses, assessments, problems, submissions, dashboard
from app.routers.thesis import rubric_router, submissions_router, examples_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create pgvector extension before creating tables
    await init_pgvector()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

app = FastAPI(
    title="DevLab Backend",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
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
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(courses.router, prefix="/courses", tags=["Courses"])
app.include_router(assessments.router, prefix="/assessments", tags=["Assessments"])
app.include_router(problems.router, prefix="/problems", tags=["Problems"])
app.include_router(submissions.router, prefix="/submissions", tags=["Submissions"])
app.include_router(dashboard.router, tags=["Dashboard"])

# Thesis Assessment routers (rubric-grounded multi-agent pipeline)
app.include_router(rubric_router)
app.include_router(submissions_router)
app.include_router(examples_router)

@app.get("/health")
def health_check():
    return {"status": "ok"}
