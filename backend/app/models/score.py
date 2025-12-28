from typing import Optional
from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel


class Score(SQLModel, table=True):
    """
    Purpose: per-user per-title Elo score.
    """

    __table_args__ = (
        UniqueConstraint("user_id", "title_id", name="uq_score_user_title"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)

    user_id: int = Field(foreign_key="user.id", nullable=False)
    title_id: int = Field(foreign_key="title.id", nullable=False)

    score: float = Field(nullable=False)
