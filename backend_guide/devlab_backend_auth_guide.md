# DevLab Backend Guide — Authentication

**Router:** `app/routers/auth.py`  
**Service:** `app/services/auth_service.py`  
**Utils:** `app/utils/jwt.py`, `app/utils/hashing.py`  
**Dependencies:** `app/dependencies.py`

---

## Endpoints

### `POST /auth/register`

Register a new user.

**Request body:**
```json
{
  "name": "Ankomah Kelvin",
  "email": "kelvin@knust.edu.gh",
  "password": "securepassword",
  "role": "lecturer"
}
```

**Logic:**
1. Check if a user with that email already exists → `409 Conflict` if so
2. Hash the password with bcrypt
3. Insert a new `User` row
4. Return `201` with a simple message

**Response `201`:**
```json
{ "message": "Registration successful." }
```

**Errors:**
- `409` — email already registered
- `422` — validation error (missing fields, invalid role value)

---

### `POST /auth/login`

Authenticate and return a JWT.

**Request body:**
```json
{
  "email": "kelvin@knust.edu.gh",
  "password": "securepassword"
}
```

**Logic:**
1. Look up the user by email → `401` if not found
2. Verify the password against the stored hash → `401` if mismatch
3. Generate a JWT (see Token section below)
4. Return the token

**Response `200`:**
```json
{
  "access_token": "<jwt>",
  "token_type": "bearer"
}
```

**Errors:**
- `401` — invalid credentials (same message for both "email not found" and "wrong password" — do not distinguish)

---

## JWT (`app/utils/jwt.py`)

Use `python-jose`.

**Payload structure:**
```python
{
  "sub": str(user.id),      # subject — user ID as string
  "role": user.role.value,  # "student" or "lecturer"
  "name": user.name,
  "exp": <unix timestamp>   # now + ACCESS_TOKEN_EXPIRE_MINUTES
}
```

```python
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from app.config import settings
from fastapi import HTTPException

def create_access_token(user) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub":  str(user.id),
        "role": user.role.value,
        "name": user.name,
        "exp":  expire,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("sub") is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
```

---

## Password Hashing (`app/utils/hashing.py`)

Use `passlib` with the bcrypt scheme:

```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)
```

---

## Auth Service (`app/services/auth_service.py`)

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User
from app.utils.hashing import hash_password, verify_password
from app.utils.jwt import create_access_token
from app.utils.errors import ConflictError
from fastapi import HTTPException

async def register_user(db: AsyncSession, name: str, email: str, password: str, role: str) -> User:
    result = await db.execute(select(User).where(User.email == email))
    if result.scalar_one_or_none():
        raise ConflictError("Email already registered")

    user = User(
        name=name,
        email=email,
        password_hash=hash_password(password),
        role=role,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

async def login_user(db: AsyncSession, email: str, password: str) -> str:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return create_access_token(user)
```

---

## Router (`app/routers/auth.py`)

```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies import get_db
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, MessageResponse
from app.services.auth_service import register_user, login_user

router = APIRouter()

@router.post("/register", response_model=MessageResponse, status_code=201)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    await register_user(db, body.name, body.email, body.password, body.role)
    return {"message": "Registration successful."}

@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    token = await login_user(db, body.email, body.password)
    return {"access_token": token, "token_type": "bearer"}
```

---

## Schemas (`app/schemas/auth.py`)

```python
from pydantic import BaseModel, EmailStr
from enum import Enum

class RoleEnum(str, Enum):
    student  = "student"
    lecturer = "lecturer"

class RegisterRequest(BaseModel):
    name:     str
    email:    EmailStr
    password: str
    role:     RoleEnum

class LoginRequest(BaseModel):
    email:    EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type:   str

class MessageResponse(BaseModel):
    message: str
```

---

## How Other Routes Use Authentication

All protected routes inject `current_user` via the shared dependency:

```python
from app.dependencies import get_current_user, require_lecturer, require_student

# Any authenticated user
@router.get("/me")
async def me(current_user = Depends(get_current_user)):
    return current_user

# Lecturer only
@router.post("/courses")
async def create_course(..., current_user = Depends(require_lecturer)):
    ...

# Student only
@router.post("/submissions/submit")
async def submit(..., current_user = Depends(require_student)):
    ...
```

---

## Out of Scope

- Password reset / forgot password flow
- Email verification
- OAuth
- Refresh tokens (single token per login, expires after 24 hours)
- Token revocation / blacklist
