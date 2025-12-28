from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel


class Friendship(SQLModel, table=True):
    """
    MVP: directed follow
    user_id (follower) -> friend_id (followed)
    """

    __table_args__ = (
        UniqueConstraint("user_id", "friend_id", name="uq_friendship_user_friend"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)

    user_id: int = Field(foreign_key="user.id", nullable=False)
    friend_id: int = Field(foreign_key="user.id", nullable=False)

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
