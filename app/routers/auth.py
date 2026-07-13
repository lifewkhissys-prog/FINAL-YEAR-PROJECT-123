from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, MessageResponse
from app.services.auth_service import register_user, login_user

router = APIRouter()

@router.post("/register", response_model=MessageResponse, status_code=201)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    await register_user(db, body.name, body.email, body.password, body.role.value)
    return {"message": "Registration successful."}

@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    token = await login_user(db, body.email, body.password)
    return {"access_token": token, "token_type": "bearer"}
