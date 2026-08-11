from datetime import datetime, timezone
from typing import Optional
from sqlmodel import Field, SQLModel


class Comparison(SQLModel, table=True):
    """A user's pairwise preference while placing a newly watched title."""

    id: Optional[int] = Field(default=None, primary_key=True)

    user_id: int = Field(foreign_key="user.id", nullable=False)

    new_title_id: int = Field(foreign_key="title.id", nullable=False, index=True)
    other_title_id: int = Field(foreign_key="title.id", nullable=False)
    preferred_title_id: int = Field(foreign_key="title.id", nullable=False)

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
