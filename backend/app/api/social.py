from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlmodel import Session

from app.core.auth import get_current_user
from app.db.session import get_session
from app.models.enums import EventType
from app.models.user import User
from app.services.social_service import (
    CannotAddSelfError,
    FriendNotFoundError,
    FriendshipAlreadyExistsError,
    add_friend,
    get_feed,
    get_friends,
)


router = APIRouter(tags=["social"])


class FriendCreate(BaseModel):
    username: str = Field(min_length=2, max_length=100)


class FriendResponse(BaseModel):
    id: int
    username: str
    full_name: str


class FeedTitleResponse(BaseModel):
    id: int
    name: str
    type: str
    year: int | None
    poster_url: str | None


class FeedItemResponse(BaseModel):
    id: int
    user: FriendResponse
    title: FeedTitleResponse
    status: EventType
    created_at: datetime


def _friend_response(user: User) -> FriendResponse:
    if user.id is None:
        raise RuntimeError("Persisted friend is missing an id")
    username = user.username or f"user{user.id}"
    full_name = user.full_name or username
    return FriendResponse(id=user.id, username=username, full_name=full_name)


@router.post(
    "/friends",
    response_model=FriendResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_friend(
    body: FriendCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> FriendResponse:
    try:
        friend = add_friend(session, current_user, body.username)
    except FriendNotFoundError as exc:
        raise HTTPException(status_code=404, detail="No WATCHD user has that username") from exc
    except CannotAddSelfError as exc:
        raise HTTPException(status_code=400, detail="You cannot add yourself") from exc
    except FriendshipAlreadyExistsError as exc:
        raise HTTPException(status_code=409, detail="You are already friends") from exc
    return _friend_response(friend)


@router.get("/friends", response_model=list[FriendResponse])
def read_friends(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> list[FriendResponse]:
    return [_friend_response(friend) for friend in get_friends(session, current_user)]


@router.get("/feed", response_model=list[FeedItemResponse])
def read_feed(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> list[FeedItemResponse]:
    result: list[FeedItemResponse] = []
    for row in get_feed(session, current_user):
        if row.activity.id is None or row.title.id is None:
            raise RuntimeError("Persisted feed item is missing an id")
        result.append(
            FeedItemResponse(
                id=row.activity.id,
                user=_friend_response(row.user),
                title=FeedTitleResponse(
                    id=row.title.id,
                    name=row.title.name,
                    type=row.title.type,
                    year=row.title.year,
                    poster_url=row.title.poster_url,
                ),
                status=row.status,
                created_at=row.activity.created_at,
            )
        )
    return result
