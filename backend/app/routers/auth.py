"""Auth endpoints — placeholder handlers only.

No real password hashing, persistence, or session/JWT issuance yet. Swap the
bodies below for real user-store + token logic when auth is implemented.
"""

import uuid

from fastapi import APIRouter

from app.schemas import AuthResponse, LoginRequest, SignupRequest

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup", response_model=AuthResponse)
def signup(payload: SignupRequest) -> AuthResponse:
    # PLACEHOLDER: create the user record in a real database and hash the
    # password (e.g. with passlib/bcrypt) instead of echoing it back unused.
    return AuthResponse(
        user_id=str(uuid.uuid4()),
        full_name=payload.full_name,
        email=payload.email,
        access_token=f"mock-token-{uuid.uuid4().hex[:12]}",
    )


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest) -> AuthResponse:
    # PLACEHOLDER: verify credentials against the real user store and issue
    # a signed session/JWT instead of a mock token.
    return AuthResponse(
        user_id=str(uuid.uuid4()),
        email=payload.email,
        access_token=f"mock-token-{uuid.uuid4().hex[:12]}",
    )
