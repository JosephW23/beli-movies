from datetime import datetime, timezone

from sqlmodel import Session, select

from app.models.enums import EventType
from app.models.event import Event
from app.models.title import Title
from app.models.user import User


class TitleNotFoundError(Exception):
    pass


def create_event(
    session: Session,
    user: User,
    title_id: int,
    status: EventType,
) -> tuple[Event, Title]:
    """Create or update the user's current status for a title."""
    if user.id is None:
        raise RuntimeError("Current user must be persisted before creating an event")

    title = session.get(Title, title_id)
    if title is None:
        raise TitleNotFoundError

    event = session.exec(
        select(Event)
        .where(Event.user_id == user.id, Event.title_id == title_id)
        .order_by(Event.created_at.desc())
    ).first()

    if event is None:
        event = Event(
            user_id=user.id,
            title_id=title_id,
            event_type=status,
        )
    else:
        event.event_type = status
        event.created_at = datetime.now(timezone.utc)

    session.add(event)
    session.commit()
    session.refresh(event)
    return event, title


def get_user_list(
    session: Session,
    user: User,
) -> dict[EventType, list[tuple[Event, Title]]]:
    if user.id is None:
        raise RuntimeError("Current user must be persisted before loading a list")

    rows = session.exec(
        select(Event, Title)
        .join(Title, Event.title_id == Title.id)
        .where(Event.user_id == user.id)
        .order_by(Event.created_at.desc())
    ).all()

    grouped: dict[EventType, list[tuple[Event, Title]]] = {
        EventType.WANT: [],
        EventType.WATCHED: [],
        EventType.WATCHING: [],
    }
    for event, title in rows:
        grouped[event.event_type].append((event, title))

    return grouped
