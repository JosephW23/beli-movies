from typing import Optional
from sqlmodel import Field, SQLModel

class Title(SQLModel, table=True):
    """
    Stores movies/TV shows you can rank and recommend.
    """

    id: Optional[int] = Field(default=None, primary_key=True)

    tmdb_id: Optional[int] = Field(default=None, unique=True)

    name: str = Field(nullable=False)

    # "movie" | "tv" stored as string for MVP
    type: str = Field(nullable=False)

    year: Optional[int] = Field(default=None)

    poster_url: Optional[str] = Field(default=None)

    # MVP: comma-separated genres string
    genres: Optional[str] = Field(default=None)
