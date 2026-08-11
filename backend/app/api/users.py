from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlmodel import Session

from app.core.auth import get_current_user
from app.db.session import get_session
from app.models.score import Score
from app.models.title import Title
from app.models.user import User
from app.services.ranking_service import get_user_rankings


router = APIRouter(tags=["users"])


class MeResponse(BaseModel):
    id: int
    email: str | None
    supabase_sub: str
    full_name: str | None
    username: str | None


class RankingResponse(BaseModel):
    rank: int
    title_id: int
    title_name: str
    type: str
    score: float
    poster_url: str | None
    year: int | None


@router.get("/me", response_model=MeResponse)
def read_me(current_user: Annotated[User, Depends(get_current_user)]) -> MeResponse:
    if current_user.id is None:
        raise RuntimeError("Persisted user is missing an id")

    return MeResponse(
        id=current_user.id,
        email=current_user.email,
        supabase_sub=current_user.supabase_sub,
        full_name=current_user.full_name,
        username=current_user.username,
    )


@router.get("/me/rankings", response_model=list[RankingResponse])
def read_my_rankings(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    media_type: Annotated[
        str | None,
        Query(alias="type", pattern="^(movie|tv)$"),
    ] = None,
) -> list[RankingResponse]:
    rows = get_user_rankings(
        session=session,
        user=current_user,
        limit=limit,
        title_type=media_type,
    )
    return [
        _ranking_response(display_rank, ranking, title)
        for display_rank, (ranking, title) in enumerate(rows, start=1)
    ]


def _ranking_response(rank: int, ranking: Score, title: Title) -> RankingResponse:
    if title.id is None:
        raise RuntimeError("Persisted ranked title is missing an id")
    return RankingResponse(
        rank=rank,
        title_id=title.id,
        title_name=title.name,
        type=title.type,
        score=ranking.score,
        poster_url=title.poster_url,
        year=title.year,
    )
