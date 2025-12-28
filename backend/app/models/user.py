from datetime import datetime, timezone
from typing import Optional
from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    """
    Purpose: map Supabase JWT `sub` -> your internal user row.
    """

    # id: int primary key (auto-increment)
    id: Optional[int] = Field(default=None, primary_key=True)

    # supabase_sub: string, unique, not null
    supabase_sub: str = Field(unique=True, index=True, nullable=False)

    # email: nullable string
    email: Optional[str] = Field(default=None)

    # created_at: timestamp
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
    )