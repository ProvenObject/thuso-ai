"""Pydantic request/response models shared across routers."""

from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    full_name: str = Field(min_length=1)
    email: EmailStr
    password: str = Field(min_length=8)
    phone: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    user_id: str
    full_name: Optional[str] = None
    email: EmailStr
    access_token: str
    token_type: str = "bearer"


class Language(BaseModel):
    code: str
    name: str
    region: str
    flag: str


class SetUserLanguageRequest(BaseModel):
    language_code: str


class SetUserLanguageResponse(BaseModel):
    ok: bool
    language_code: str
