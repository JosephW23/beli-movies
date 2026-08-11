from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlmodel import Session

from app.db.session import get_session
from app.core.auth import get_current_user
from app.models.title import Title
from app.models.user import User
from app.services.titles_service import (
    get_title_by_id,
    get_title_rating_summary,
    import_tmdb_title,
    search_titles,
)
from app.services.tmdb_service import (
    TmdbConfigurationError,
    TmdbNotFoundError,
    TmdbService,
    TmdbUnavailableError,
)

router = APIRouter(prefix="/titles", tags=["titles"])


class RatingSummaryResponse(BaseModel):
    average_score: float | None
    rating_count: int


class TmdbImportRequest(BaseModel):
    tmdb_id: int = Field(gt=0)
    type: Literal["movie", "tv"]


@router.get("", response_model=dict)
def list_titles(
    session: Annotated[Session, Depends(get_session)],
    query: str | None = Query(default=None),
    type: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
) -> dict:
    items, total = search_titles(
        session=session,
        query=query,
        type=type,
        limit=limit,
        offset=offset,
    )

    return {
        "items": items,
        "limit": limit,
        "offset": offset,
        "total": total,
        "has_more": offset + len(items) < total,
    }


@router.post("/import", response_model=Title)
def import_external_title(
    body: TmdbImportRequest,
    _current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> Title:
    try:
        external = TmdbService().get_title_details(body.type, body.tmdb_id)
    except TmdbNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except TmdbConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except TmdbUnavailableError as exc:
        raise HTTPException(status_code=502, detail="Could not load title from TMDb") from exc
    return import_tmdb_title(session, external)


@router.get("/{title_id}", response_model=Title)
def read_title(
    title_id: int,
    session: Annotated[Session, Depends(get_session)],
) -> Title:
    title = get_title_by_id(session=session, title_id=title_id)
    if not title:
        raise HTTPException(status_code=404, detail="Title not found")
    return title


@router.get("/{title_id}/rating-summary", response_model=RatingSummaryResponse)
def read_title_rating_summary(
    title_id: int,
    session: Annotated[Session, Depends(get_session)],
) -> RatingSummaryResponse:
    if get_title_by_id(session=session, title_id=title_id) is None:
        raise HTTPException(status_code=404, detail="Title not found")
    average, count = get_title_rating_summary(session, title_id)
    return RatingSummaryResponse(average_score=average, rating_count=count)
