from __future__ import annotations
from typing import Optional, Tuple, List
from sqlmodel import Session, select, func
from app.models.title import Title

def search_titles(
    session: Session,
    query: Optional[str],
    type: Optional[str],
    page: int,
    page_size: int,
) -> Tuple[List[Title], int]:
    """
    Returns (items, total).

    - query: optional search string (matches Title.name)
    - type: optional filter ("movie" or "tv")
    - page/page_size: pagination
    """

    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)  # safety cap
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


def get_title_by_id(session: Session, title_id: int) -> Optional[Title]:
    stmt = select(Title).where(Title.id == title_id)
    return session.exec(stmt).first()
    