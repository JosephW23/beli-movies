from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, func, select

from app.models.score import Score
from app.models.title import Title
from app.services.tmdb_service import TmdbTitle


def search_titles(
    session: Session,
    query: str | None,
    type: str | None,
    limit: int,
    offset: int,
) -> tuple[list[Title], int]:
    """
    Returns (items, total).

    - query: optional search string (matches Title.name)
    - type: optional filter ("movie" or "tv")
    - limit/offset: pagination applied by the database
    """

    limit = min(max(limit, 1), 50)
    offset = max(offset, 0)

    # Build the base "list" query
    stmt = select(Title)

    # Apply filters only if provided
    if query:
        # ilike = case-insensitive match in Postgres
        stmt = stmt.where(Title.name.ilike(f"%{query}%"))

    if type:
        stmt = stmt.where(Title.type == type)

    # Build a separate count query (same filters, but count rows)
    count_stmt = select(func.count()).select_from(Title)

    if query:
        count_stmt = count_stmt.where(Title.name.ilike(f"%{query}%"))
    if type:
        count_stmt = count_stmt.where(Title.type == type)

    total = session.exec(count_stmt).one()

    # Apply pagination to the list query
    items = session.exec(
        stmt.order_by(Title.name, Title.id).offset(offset).limit(limit)
    ).all()

    return items, total


def get_title_by_id(session: Session, title_id: int) -> Title | None:
    stmt = select(Title).where(Title.id == title_id)
    return session.exec(stmt).first()


def get_title_by_tmdb_source(
    session: Session, tmdb_id: int, media_type: str
) -> Title | None:
    return session.exec(
        select(Title).where(Title.tmdb_id == tmdb_id, Title.type == media_type)
    ).first()


def import_tmdb_title(session: Session, external: TmdbTitle) -> Title:
    existing = get_title_by_tmdb_source(session, external.tmdb_id, external.type)
    if existing is not None:
        existing.name = external.name
        existing.year = external.year
        existing.poster_url = external.poster_url
        existing.genres = ",".join(external.genres) or existing.genres
        existing.overview = external.overview
        existing.runtime_minutes = external.runtime_minutes
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing

    title = Title(
        tmdb_id=external.tmdb_id,
        name=external.name,
        type=external.type,
        year=external.year,
        poster_url=external.poster_url,
        genres=",".join(external.genres) or None,
        overview=external.overview,
        runtime_minutes=external.runtime_minutes,
    )
    session.add(title)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        reused = get_title_by_tmdb_source(session, external.tmdb_id, external.type)
        if reused is None:
            raise
        return reused
    session.refresh(title)
    return title


def get_title_rating_summary(session: Session, title_id: int) -> tuple[float | None, int]:
    average, count = session.exec(
        select(func.avg(Score.score), func.count(Score.id)).where(Score.title_id == title_id)
    ).one()
    return (round(float(average), 1) if average is not None else None, int(count))
