import os
from typing import Annotated, Any

import jwt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import InvalidTokenError, PyJWKClient, PyJWKClientError
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func
from sqlmodel import Session, select

from app.db.session import get_session
from app.core.usernames import normalize_username
from app.models.user import User


load_dotenv()

SUPABASE_JWKS_URL = os.getenv("SUPABASE_JWKS_URL")
SUPABASE_ISSUER = os.getenv("SUPABASE_ISSUER")
SUPABASE_AUDIENCE = os.getenv("SUPABASE_AUDIENCE")

if not all((SUPABASE_JWKS_URL, SUPABASE_ISSUER, SUPABASE_AUDIENCE)):
    raise RuntimeError(
        "SUPABASE_JWKS_URL, SUPABASE_ISSUER, and SUPABASE_AUDIENCE must be set"
    )

_jwks_client = PyJWKClient(
    SUPABASE_JWKS_URL,
    cache_keys=True,
    cache_jwk_set=True,
    lifespan=600,
    timeout=10,
)
_bearer = HTTPBearer(auto_error=False)


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication token",
        headers={"WWW-Authenticate": "Bearer"},
    )


def verify_token(token: str) -> dict[str, Any]:
    """Verify a Supabase access token and return its trusted claims."""
    try:
        signing_key = _jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256", "RS256"],
            audience=SUPABASE_AUDIENCE,
            issuer=SUPABASE_ISSUER,
            options={"require": ["aud", "exp", "iss", "sub"]},
        )
    except (InvalidTokenError, PyJWKClientError, TimeoutError, OSError) as exc:
        raise _unauthorized() from exc

    if not isinstance(payload.get("sub"), str) or not payload["sub"]:
        raise _unauthorized()

    return payload


def _available_username(session: Session, requested: str) -> str:
    base = normalize_username(requested)
    candidate = base
    suffix = 2
    while session.exec(
        select(User).where(func.lower(User.username) == candidate.lower())
    ).first() is not None:
        suffix_text = str(suffix)
        candidate = f"{base[: 24 - len(suffix_text)]}{suffix_text}"
        suffix += 1
    return candidate


def _get_or_create_user(session: Session, payload: dict[str, Any]) -> User:
    supabase_sub = payload["sub"]
    email_claim = payload.get("email")
    email = email_claim if isinstance(email_claim, str) else None
    metadata_claim = payload.get("user_metadata")
    metadata = metadata_claim if isinstance(metadata_claim, dict) else {}
    full_name_claim = metadata.get("full_name")
    full_name = full_name_claim.strip() if isinstance(full_name_claim, str) else None
    requested_username_claim = metadata.get("username")
    requested_username = (
        requested_username_claim
        if isinstance(requested_username_claim, str)
        else full_name or (email.split("@", 1)[0] if email else "watchduser")
    )

    user = session.exec(
        select(User).where(User.supabase_sub == supabase_sub)
    ).one_or_none()

    if user is not None:
        changed = False
        if user.email != email:
            user.email = email
            changed = True
        if full_name and user.full_name != full_name:
            user.full_name = full_name
            changed = True
        if not user.username:
            user.username = _available_username(session, requested_username)
            changed = True
        if changed:
            session.add(user)
            session.commit()
            session.refresh(user)
        return user

    user = User(
        supabase_sub=supabase_sub,
        email=email,
        full_name=full_name,
        username=_available_username(session, requested_username),
    )
    session.add(user)

    try:
        session.commit()
    except IntegrityError:
        # A concurrent first request may have inserted the same Supabase user.
        session.rollback()
        existing_user = session.exec(
            select(User).where(User.supabase_sub == supabase_sub)
        ).one()
        return existing_user

    session.refresh(user)
    return user


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    session: Annotated[Session, Depends(get_session)],
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _unauthorized()

    payload = verify_token(credentials.credentials)
    return _get_or_create_user(session, payload)
