from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session
from app.db.session import get_session
from app.models.title import Title
from app.services.titles_service import search_titles, get_title_by_id

router = APIRouter(prefix="/titles", tags=["titles"])


@router.get("", response_model=dict)
def list_titles(
    query: Optional[str] = Query(default=None),
    type: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    session: Session = Depends(get_session),
):
    """
    List/search titles.

    Response shape:
    {
      "items": [...],
      "page": 1,
      "page_size": 20,
      "total": 123
    }
    """
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
def read_title(title_id: int, session: Session = Depends(get_session)):
    title = get_title_by_id(session=session, title_id=title_id)
    if not title:
        raise HTTPException(status_code=404, detail="Title not found")
    return title
