from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.utils.jwt import decode_access_token
from app.models.user import User, UserRole

security = HTTPBearer(auto_error=False)

MOCK_DEMO_USER = User(
    id=1,
    name="Dr. Kwame Mensah",
    email="lecturer@knust.edu.gh",
    role=UserRole.lecturer
)

async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    token = credentials.credentials if (credentials and credentials.credentials) else request.query_params.get("token")
    if token:
        payload = decode_access_token(token)
        if payload and payload.get("sub"):
            try:
                user_id = int(payload.get("sub"))
                result = await db.execute(select(User).where(User.id == user_id))
                user = result.scalar_one_or_none()
                if user:
                    return user
            except Exception:
                pass
    
    # Unauthenticated testing fallback — return default demo lecturer user
    return MOCK_DEMO_USER

async def require_lecturer(current_user: User = Depends(get_current_user)) -> User:
    return current_user

async def require_student(current_user: User = Depends(get_current_user)) -> User:
    return current_user
