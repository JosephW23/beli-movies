from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlmodel import Session

from app.core.auth import get_current_user
from app.db.session import get_session
from app.models.title import Title
from app.models.user import User
from app.services.ranking_service import (
    InvalidComparisonError,
    RankingProgress,
    RankingTitleNotFoundError,
    TitleNotWatchedError,
    get_next_comparison,
    record_preference,
    record_too_tough,
)


router = APIRouter(prefix="/compare", tags=["ranking"])


class ComparisonTitleResponse(BaseModel):
    id: int
    name: str
    type: str
    year: int | None
    poster_url: str | None


class ComparisonResponse(BaseModel):
    complete: bool
    new_title: ComparisonTitleResponse
    comparison_title: ComparisonTitleResponse | None
    comparison_number: int
    estimated_comparisons: int
    rank_position: int | None
    score: float | None
    total_ranked: int


class PreferenceCreate(BaseModel):
    title_id: int = Field(gt=0)
    comparison_title_id: int = Field(gt=0)
    preferred_title_id: int = Field(gt=0)
    enjoyed: bool


class TooToughCreate(BaseModel):
    title_id: int = Field(gt=0)
    comparison_title_id: int = Field(gt=0)
    enjoyed: bool


@router.get("/candidate", response_model=ComparisonResponse)
def read_comparison_candidate(
    title_id: Annotated[int, Query(gt=0)],
    enjoyed: Annotated[bool, Query()],
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
    exclude_title_ids: str | None = Query(default=None),
) -> ComparisonResponse:
    excluded = _parse_excluded_ids(exclude_title_ids)
    try:
        progress = get_next_comparison(
            session, current_user, title_id, enjoyed, excluded
        )
    except RankingTitleNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Title not found") from exc
    except TitleNotWatchedError as exc:
        raise HTTPException(status_code=409, detail="Title must be watched before ranking") from exc
    return _response(progress)


@router.post("", response_model=ComparisonResponse)
def create_preference(
    body: PreferenceCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> ComparisonResponse:
    try:
        progress = record_preference(
            session=session,
            user=current_user,
            title_id=body.title_id,
            comparison_title_id=body.comparison_title_id,
            preferred_title_id=body.preferred_title_id,
            enjoyed=body.enjoyed,
        )
    except RankingTitleNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Title not found") from exc
    except TitleNotWatchedError as exc:
        raise HTTPException(status_code=409, detail="Title must be watched before ranking") from exc
    except InvalidComparisonError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return _response(progress)


@router.post("/too-tough", response_model=ComparisonResponse)
def create_too_tough_placement(
    body: TooToughCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> ComparisonResponse:
    try:
        progress = record_too_tough(
            session=session,
            user=current_user,
            title_id=body.title_id,
            comparison_title_id=body.comparison_title_id,
            enjoyed=body.enjoyed,
        )
    except RankingTitleNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Title not found") from exc
    except TitleNotWatchedError as exc:
        raise HTTPException(status_code=409, detail="Title must be watched before ranking") from exc
    except InvalidComparisonError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return _response(progress)


def _response(progress: RankingProgress) -> ComparisonResponse:
    return ComparisonResponse(
        complete=progress.complete,
        new_title=_title_response(progress.new_title),
        comparison_title=(
            _title_response(progress.comparison_title)
            if progress.comparison_title is not None
            else None
        ),
        comparison_number=progress.comparison_number,
        estimated_comparisons=progress.estimated_comparisons,
        rank_position=progress.rank_position,
        score=progress.score,
        total_ranked=progress.total_ranked,
    )


def _title_response(title: Title) -> ComparisonTitleResponse:
    if title.id is None:
        raise RuntimeError("Persisted comparison title is missing an id")
    return ComparisonTitleResponse(
        id=title.id,
        name=title.name,
        type=title.type,
        year=title.year,
        poster_url=title.poster_url,
    )


def _parse_excluded_ids(value: str | None) -> set[int]:
    if not value:
        return set()
    try:
        return {int(item) for item in value.split(",") if item.strip()}
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="exclude_title_ids must contain integers") from exc
