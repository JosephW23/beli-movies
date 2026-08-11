from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Index, UniqueConstraint
from sqlmodel import Field, SQLModel


class Score(SQLModel, table=True):
    """A title's position and readable 1–10 score in one user's ranking."""

    __table_args__ = (
        UniqueConstraint("user_id", "title_id", name="uq_score_user_title"),
        Index("ix_score_user_title", "user_id", "title_id"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)

    user_id: int = Field(foreign_key="user.id", nullable=False)
    title_id: int = Field(foreign_key="title.id", nullable=False)
    rank_position: int = Field(nullable=False, index=True)
    score: float = Field(nullable=False)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
