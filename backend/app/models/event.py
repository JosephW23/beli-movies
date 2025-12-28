from datetime import datetime, timezone
from typing import Optional
from sqlmodel import Field, SQLModel
from app.models.enums import EventType


class Event(SQLModel, table=True):
    """
    Purpose: user marks WANT, WATCHED, or WATCHING for a title.
    """

    # Primary key
    id: Optional[int] = Field(default=None, primary_key=True)

    # FK -> User.id
    user_id: int = Field(foreign_key="user.id", nullable=False)

    # FK -> Title.id
    title_id: int = Field(foreign_key="title.id", nullable=False)

    # enum: WANT / WATCHED / WATCHING
    event_type: EventType = Field(nullable=False)

    # Timestamp for when the event was created
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
