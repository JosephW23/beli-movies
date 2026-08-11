from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session

from app.core.auth import get_current_user
from app.db.session import get_session
from app.models.user import User
from app.services.recs_service import Recommendation, get_recommendations
from app.services.tmdb_service import (
    TmdbConfigurationError,
    TmdbNotFoundError,
    TmdbUnavailableError,
)


router = APIRouter(tags=["recommendations"])


class RecommendationResponse(BaseModel):
    id: str
    tmdb_id: int
    type: Literal["movie", "tv"]
    name: str
    year: int | None
    poster_url: str | None
    overview: str | None
    genre_ids: list[int]
    genres: list[str]
    runtime_minutes: int | None
    local_title_id: int | None = None
    average_score: float | None = None
    rating_count: int = 0
    reason: str


@router.get("/me/recs", response_model=list[RecommendationResponse])
def read_my_recommendations(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
    page: Annotated[int, Query(ge=1, le=500)] = 1,
) -> list[RecommendationResponse]:
    try:
        recommendations = get_recommendations(
            session, current_user, limit=limit, page=page
        )
    except TmdbConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except (TmdbUnavailableError, TmdbNotFoundError) as exc:
        raise HTTPException(
            status_code=502,
            detail="Could not load recommendations from TMDb",
        ) from exc
    return [_response(item) for item in recommendations]


def _response(item: Recommendation) -> RecommendationResponse:
    title = item.title
    return RecommendationResponse(
        id=f"{title.type}:{title.tmdb_id}",
        tmdb_id=title.tmdb_id,
        type=title.type,
        name=title.name,
        year=title.year,
        poster_url=title.poster_url,
        overview=title.overview,
        genre_ids=title.genre_ids,
        genres=title.genres,
        runtime_minutes=title.runtime_minutes,
        reason=item.reason,
    )
