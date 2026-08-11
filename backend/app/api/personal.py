from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlmodel import Session

from app.core.auth import get_current_user
from app.db.session import get_session
from app.models.enums import EventType
from app.models.review import Review
from app.models.score import Score
from app.models.title import Title
from app.models.user import User
from app.services.ranking_service import (
    RankingTitleNotFoundError,
    TitleNotWatchedError,
    set_manual_score,
)
from app.services.reviews_service import (
    PersonalTitleNotFoundError,
    PersonalTitleNotWatchedError,
    get_personal_title,
    get_user_reviews,
    upsert_review,
)


router = APIRouter(tags=["personal titles"])


class PersonalTitleResponse(BaseModel):
    title_id: int
    status: EventType | None
    personal_score: float | None
    review: str | None


class ScoreUpdate(BaseModel):
    score: float = Field(ge=1.0, le=10.0)

    @field_validator("score")
    @classmethod
    def one_decimal_place(cls, value: float) -> float:
        return round(value, 1)


class ReviewUpdate(BaseModel):
    body: str = Field(min_length=1, max_length=1000)

    @field_validator("body")
    @classmethod
    def non_blank(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Review cannot be blank")
        return normalized


class ReviewResponse(BaseModel):
    id: int
    title_id: int
    title_name: str
    poster_url: str | None
    year: int | None
    score: float | None
    body: str
    updated_at: datetime


@router.get("/me/titles/{title_id}", response_model=PersonalTitleResponse)
def read_personal_title(
    title_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> PersonalTitleResponse:
    try:
        event, score, review = get_personal_title(session, current_user, title_id)
    except PersonalTitleNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Title not found") from exc
    return PersonalTitleResponse(
        title_id=title_id,
        status=event.event_type if event else None,
        personal_score=score.score if score else None,
        review=review.body if review else None,
    )


@router.patch("/me/titles/{title_id}/score", response_model=PersonalTitleResponse)
def update_personal_score(
    title_id: int,
    body: ScoreUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> PersonalTitleResponse:
    try:
        set_manual_score(session, current_user, title_id, body.score)
        event, score, review = get_personal_title(session, current_user, title_id)
    except RankingTitleNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Title not found") from exc
    except TitleNotWatchedError as exc:
        raise HTTPException(status_code=409, detail="Finish rating this watched title first") from exc
    return PersonalTitleResponse(
        title_id=title_id,
        status=event.event_type if event else None,
        personal_score=score.score if score else None,
        review=review.body if review else None,
    )


@router.put("/me/titles/{title_id}/review", response_model=ReviewResponse)
def save_review(
    title_id: int,
    body: ReviewUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> ReviewResponse:
    try:
        review = upsert_review(session, current_user, title_id, body.body)
    except PersonalTitleNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Title not found") from exc
    except PersonalTitleNotWatchedError as exc:
        raise HTTPException(status_code=409, detail="Mark this title watched before reviewing it") from exc
    title = session.get(Title, title_id)
    if title is None:
        raise HTTPException(status_code=404, detail="Title not found")
    _, score, _ = get_personal_title(session, current_user, title_id)
    return _review_response(review, title, score)


@router.get("/me/reviews", response_model=list[ReviewResponse])
def read_my_reviews(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> list[ReviewResponse]:
    return [
        _review_response(review, title, score)
        for review, title, score in get_user_reviews(session, current_user)
    ]


def _review_response(review: Review, title: Title, score: Score | None) -> ReviewResponse:
    if review.id is None or title.id is None:
        raise RuntimeError("Persisted review is missing an id")
    return ReviewResponse(
        id=review.id,
        title_id=title.id,
        title_name=title.name,
        poster_url=title.poster_url,
        year=title.year,
        score=score.score if score else None,
        body=review.body,
        updated_at=review.updated_at,
    )
