from typing import Annotated

from fastapi import APIRouter, Depends
from sqlmodel import Session, text

from app.db.session import get_session


router = APIRouter(tags=["health"])


@router.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/db-health")
def db_health(
    session: Annotated[Session, Depends(get_session)],
) -> dict[str, str]:
    session.exec(text("SELECT 1"))
    return {"db": "ok"}
