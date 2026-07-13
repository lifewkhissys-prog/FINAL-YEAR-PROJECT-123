from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
from app.utils.errors import register_error_handlers
from app.routers import auth, courses, assessments, problems, submissions, thesis, dashboard

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure all tables are created on startup
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
app.include_router(thesis.router, prefix="/thesis-critique", tags=["Thesis Critique"])
app.include_router(dashboard.router, tags=["Dashboard"]) # Mounted at root to support /lecturer and /student endpoints

@app.get("/health")
def health_check():
    return {"status": "ok"}
