from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel


class Review(SQLModel, table=True):
    """One optional written review per user and watched title."""

    __table_args__ = (
        UniqueConstraint("user_id", "title_id", name="uq_review_user_title"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", nullable=False, index=True)
    title_id: int = Field(foreign_key="title.id", nullable=False, index=True)
    body: str = Field(nullable=False, max_length=1000)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), nullable=False
    )
