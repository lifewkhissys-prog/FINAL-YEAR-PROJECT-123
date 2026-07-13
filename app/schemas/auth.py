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
