from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlmodel import Session

from app.core.auth import get_current_user
from app.db.session import get_session
from app.models.enums import EventType
from app.models.event import Event
from app.models.title import Title
from app.models.user import User
from app.services.events_service import (
    TitleNotFoundError,
    create_event,
    get_user_list,
)


router = APIRouter(tags=["events"])


class EventCreate(BaseModel):
    title_id: int = Field(gt=0)
    status: EventType


class EventResponse(BaseModel):
    id: int
    title_id: int
    status: EventType
    created_at: datetime


class SavedTitle(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    type: str
    year: int | None
    poster_url: str | None
    genres: str | None
    tmdb_id: int | None
    event_id: int
    status: EventType
    saved_at: datetime


class MyListResponse(BaseModel):
    want_to_watch: list[SavedTitle]
    watched: list[SavedTitle]


def _event_response(event: Event) -> EventResponse:
    if event.id is None:
        raise RuntimeError("Persisted event is missing an id")

    return EventResponse(
        id=event.id,
        title_id=event.title_id,
        status=event.event_type,
        created_at=event.created_at,
    )


def _saved_title(event: Event, title: Title) -> SavedTitle:
    if event.id is None or title.id is None:
        raise RuntimeError("Persisted list item is missing an id")

    return SavedTitle(
        id=title.id,
        name=title.name,
        type=title.type,
        year=title.year,
        poster_url=title.poster_url,
        genres=title.genres,
        tmdb_id=title.tmdb_id,
        event_id=event.id,
        status=event.event_type,
        saved_at=event.created_at,
    )


@router.post(
    "/events",
    response_model=EventResponse,
    status_code=status.HTTP_201_CREATED,
)
def save_event(
    body: EventCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> EventResponse:
    try:
        event, _ = create_event(
            session=session,
            user=current_user,
            title_id=body.title_id,
            status=body.status,
        )
    except TitleNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Title not found") from exc

    return _event_response(event)


@router.get("/me/list", response_model=MyListResponse)
def read_my_list(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> MyListResponse:
    grouped = get_user_list(session=session, user=current_user)
    return MyListResponse(
        want_to_watch=[
            _saved_title(event, title)
            for event, title in grouped[EventType.WANT]
        ],
        watched=[
            _saved_title(event, title)
            for event, title in grouped[EventType.WATCHED]
        ],
    )
