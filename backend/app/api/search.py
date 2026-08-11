from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session, select

from app.db.session import get_session
from app.models.title import Title
from app.services.titles_service import get_title_rating_summary
from app.services.tmdb_service import (
    TmdbConfigurationError,
    TmdbNotFoundError,
    TmdbService,
    TmdbTitle,
    TmdbUnavailableError,
)


router = APIRouter(prefix="/search", tags=["search"])


class ExternalTitleResponse(BaseModel):
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


def _response(
    title: TmdbTitle,
    local_title: Title | None = None,
    average_score: float | None = None,
    rating_count: int = 0,
) -> ExternalTitleResponse:
    return ExternalTitleResponse(
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
        local_title_id=local_title.id if local_title else None,
        average_score=average_score,
        rating_count=rating_count,
    )


def _tmdb_error(exc: Exception) -> HTTPException:
    if isinstance(exc, TmdbNotFoundError):
        return HTTPException(status_code=404, detail=str(exc))
    if isinstance(exc, TmdbConfigurationError):
        return HTTPException(status_code=503, detail=str(exc))
    return HTTPException(status_code=502, detail="Could not load results from TMDb")


@router.get("", response_model=list[ExternalTitleResponse])
def search_external_titles(
    session: Annotated[Session, Depends(get_session)],
    q: str = Query(min_length=1, max_length=100),
) -> list[ExternalTitleResponse]:
    query = q.strip()
    if not query:
        raise HTTPException(status_code=422, detail="Search query cannot be empty")
    try:
        results = TmdbService().search_titles(query)
    except (TmdbConfigurationError, TmdbUnavailableError, TmdbNotFoundError) as exc:
        raise _tmdb_error(exc) from exc

    tmdb_ids = [title.tmdb_id for title in results]
    local_titles = session.exec(select(Title).where(Title.tmdb_id.in_(tmdb_ids))).all() if tmdb_ids else []
    local_by_source = {(title.type, title.tmdb_id): title for title in local_titles}
    return [_response(title, local_by_source.get((title.type, title.tmdb_id))) for title in results]


@router.get("/trending", response_model=list[ExternalTitleResponse])
def read_trending_titles(
    session: Annotated[Session, Depends(get_session)],
    page: Annotated[int, Query(ge=1, le=500)] = 1,
) -> list[ExternalTitleResponse]:
    try:
        results = TmdbService().get_trending_titles(page)
    except (TmdbConfigurationError, TmdbUnavailableError, TmdbNotFoundError) as exc:
        raise _tmdb_error(exc) from exc

    tmdb_ids = [title.tmdb_id for title in results]
    local_titles = session.exec(select(Title).where(Title.tmdb_id.in_(tmdb_ids))).all() if tmdb_ids else []
    local_by_source = {(title.type, title.tmdb_id): title for title in local_titles}
    return [_response(title, local_by_source.get((title.type, title.tmdb_id))) for title in results]


@router.get("/{media_type}/{tmdb_id}", response_model=ExternalTitleResponse)
def read_external_title(
    media_type: Literal["movie", "tv"],
    tmdb_id: int,
    session: Annotated[Session, Depends(get_session)],
) -> ExternalTitleResponse:
    try:
        title = TmdbService().get_title_details(media_type, tmdb_id)
    except (TmdbConfigurationError, TmdbUnavailableError, TmdbNotFoundError) as exc:
        raise _tmdb_error(exc) from exc

    local_title = session.exec(
        select(Title).where(Title.tmdb_id == tmdb_id, Title.type == media_type)
    ).first()
    average_score: float | None = None
    rating_count = 0
    if local_title and local_title.id is not None:
        average_score, rating_count = get_title_rating_summary(session, local_title.id)
    return _response(title, local_title, average_score, rating_count)
