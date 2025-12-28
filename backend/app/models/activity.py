from datetime import datetime, timezone
from typing import Optional
from sqlmodel import Field, SQLModel
from app.models.enums import ActivityType


class Activity(SQLModel, table=True):
    """
    Purpose: power the feed (event created, compare made, friend added).
    """

    id: Optional[int] = Field(default=None, primary_key=True)

    user_id: int = Field(foreign_key="user.id", nullable=False)

    activity_type: ActivityType = Field(nullable=False)

    # Optional FK -> Title.id (only for title-related activities)
    title_id: Optional[int] = Field(default=None, foreign_key="title.id")

    # MVP simple text column
    metadata_json: Optional[str] = Field(default=None)

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
