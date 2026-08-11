from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session

from app.db.session import get_session
from app.models.title import Title
from app.services.titles_service import (
    get_title_by_id,
    get_title_rating_summary,
    search_titles,
)

router = APIRouter(prefix="/titles", tags=["titles"])


class RatingSummaryResponse(BaseModel):
    average_score: float | None
    rating_count: int


@router.get("", response_model=dict)
def list_titles(
    session: Annotated[Session, Depends(get_session)],
    query: str | None = Query(default=None),
    type: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> dict:
    items, total = search_titles(
        session=session,
        query=query,
        type=type,
        page=page,
        page_size=page_size,
    )

    return {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total": total,
    }


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
