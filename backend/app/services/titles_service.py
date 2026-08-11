from sqlmodel import Session, func, select

from app.models.score import Score
from app.models.title import Title


def search_titles(
    session: Session,
    query: str | None,
    type: str | None,
    page: int,
    page_size: int,
) -> tuple[list[Title], int]:
    """
    Returns (items, total).

    - query: optional search string (matches Title.name)
    - type: optional filter ("movie" or "tv")
    - page/page_size: pagination
    """

    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)
    offset = (page - 1) * page_size

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
    items = session.exec(stmt.offset(offset).limit(page_size)).all()

    return items, total


def get_title_by_id(session: Session, title_id: int) -> Title | None:
    stmt = select(Title).where(Title.id == title_id)
    return session.exec(stmt).first()


def get_title_rating_summary(session: Session, title_id: int) -> tuple[float | None, int]:
    average, count = session.exec(
        select(func.avg(Score.score), func.count(Score.id)).where(Score.title_id == title_id)
    ).one()
    return (round(float(average), 1) if average is not None else None, int(count))
