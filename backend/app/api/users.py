from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.auth import get_current_user
from app.models.user import User


router = APIRouter(tags=["users"])


class MeResponse(BaseModel):
    id: int
    email: str | None
    supabase_sub: str


@router.get("/me", response_model=MeResponse)
def read_me(current_user: Annotated[User, Depends(get_current_user)]) -> MeResponse:
    if current_user.id is None:
        raise RuntimeError("Persisted user is missing an id")

    return MeResponse(
        id=current_user.id,
        email=current_user.email,
        supabase_sub=current_user.supabase_sub,
    )
