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
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"}
        )

    payload = decode_access_token(token)
    if not payload or not payload.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"}
        )

    try:
        user_id = int(payload.get("sub"))
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user:
            return user
    except Exception:
        pass

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="User not found",
        headers={"WWW-Authenticate": "Bearer"}
    )

async def require_lecturer(current_user: User = Depends(get_current_user)) -> User:
    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if role_str != "lecturer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation not permitted: Lecturer access required"
        )
    return current_user

async def require_student(current_user: User = Depends(get_current_user)) -> User:
    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if role_str != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation not permitted: Student access required"
        )
    return current_user

