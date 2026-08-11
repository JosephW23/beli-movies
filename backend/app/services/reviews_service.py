from datetime import datetime, timezone

from sqlmodel import Session, select

from app.models.enums import EventType
from app.models.event import Event
from app.models.review import Review
from app.models.score import Score
from app.models.title import Title
from app.models.user import User


class PersonalTitleError(Exception):
    pass


class PersonalTitleNotFoundError(PersonalTitleError):
    pass


class PersonalTitleNotWatchedError(PersonalTitleError):
    pass


def get_personal_title(
    session: Session, user: User, title_id: int
) -> tuple[Event | None, Score | None, Review | None]:
    user_id = _user_id(user)
    _title(session, title_id)
    event = session.exec(
        select(Event).where(Event.user_id == user_id, Event.title_id == title_id)
    ).first()
    score = session.exec(
        select(Score).where(Score.user_id == user_id, Score.title_id == title_id)
    ).first()
    review = session.exec(
        select(Review).where(Review.user_id == user_id, Review.title_id == title_id)
    ).first()
    return event, score, review


def upsert_review(session: Session, user: User, title_id: int, body: str) -> Review:
    user_id = _user_id(user)
    _require_watched(session, user_id, title_id)
    normalized = body.strip()
    review = session.exec(
        select(Review).where(Review.user_id == user_id, Review.title_id == title_id)
    ).first()
    now = datetime.now(timezone.utc)
    if review is None:
        review = Review(
            user_id=user_id,
            title_id=title_id,
            body=normalized,
            updated_at=now,
        )
    else:
        review.body = normalized
        review.updated_at = now
    session.add(review)
    session.commit()
    session.refresh(review)
    return review


def get_user_reviews(session: Session, user: User) -> list[tuple[Review, Title, Score | None]]:
    user_id = _user_id(user)
    return list(
        session.exec(
            select(Review, Title, Score)
            .join(Title, Review.title_id == Title.id)
            .join(
                Score,
                (Score.title_id == Review.title_id) & (Score.user_id == user_id),
                isouter=True,
            )
            .where(Review.user_id == user_id)
            .order_by(Review.updated_at.desc())
        ).all()
    )


def _require_watched(session: Session, user_id: int, title_id: int) -> None:
    _title(session, title_id)
    event = session.exec(
        select(Event).where(Event.user_id == user_id, Event.title_id == title_id)
    ).first()
    if event is None or event.event_type != EventType.WATCHED:
        raise PersonalTitleNotWatchedError


def _title(session: Session, title_id: int) -> Title:
    title = session.get(Title, title_id)
    if title is None:
        raise PersonalTitleNotFoundError
    return title


def _user_id(user: User) -> int:
    if user.id is None:
        raise RuntimeError("Current user must be persisted")
    return user.id
