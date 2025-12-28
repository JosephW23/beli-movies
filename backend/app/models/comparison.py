from datetime import datetime, timezone
from typing import Optional
from sqlmodel import Field, SQLModel


class Comparison(SQLModel, table=True):
    """
    Purpose: store each A vs B decision.
    """

    id: Optional[int] = Field(default=None, primary_key=True)

    user_id: int = Field(foreign_key="user.id", nullable=False)

    title_a_id: int = Field(foreign_key="title.id", nullable=False)
    title_b_id: int = Field(foreign_key="title.id", nullable=False)

    winner_title_id: int = Field(foreign_key="title.id", nullable=False)

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
