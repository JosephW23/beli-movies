import math
from dataclasses import dataclass
from datetime import datetime, timezone

from sqlmodel import Session, select

from app.models.comparison import Comparison
from app.models.enums import EventType
from app.models.event import Event
from app.models.score import Score
from app.models.title import Title
from app.models.user import User


class RankingError(Exception):
    pass


class RankingTitleNotFoundError(RankingError):
    pass


class TitleNotWatchedError(RankingError):
    pass


class InvalidComparisonError(RankingError):
    pass


@dataclass(frozen=True)
class RankingProgress:
    new_title: Title
    comparison_title: Title | None
    complete: bool
    rank_position: int | None = None
    score: float | None = None
    comparison_number: int = 0
    estimated_comparisons: int = 0
    total_ranked: int = 0


ENJOYED_MIN_SCORE = 5.0
ENJOYED_DEFAULT_SCORE = 7.5
NOT_ENJOYED_MAX_SCORE = 4.9
NOT_ENJOYED_DEFAULT_SCORE = 3.5
SCORE_STEP = 0.5


def get_user_rankings(
    session: Session,
    user: User,
    limit: int = 20,
    title_type: str | None = None,
) -> list[tuple[Score, Title]]:
    user_id = _user_id(user)
    statement = (
        select(Score, Title)
        .join(Title, Score.title_id == Title.id)
        .where(Score.user_id == user_id)
        .order_by(Score.score.desc(), Score.rank_position, Score.id)
        .limit(limit)
    )
    if title_type:
        statement = statement.where(Title.type == title_type)
    return list(session.exec(statement).all())


def start_ranking(
    session: Session,
    user: User,
    title_id: int,
    enjoyed: bool,
) -> RankingProgress:
    user_id = _user_id(user)
    title = _watched_title(session, user_id, title_id)

    existing_score = session.exec(
        select(Score).where(Score.user_id == user_id, Score.title_id == title_id)
    ).first()
    if existing_score is not None:
        return _complete_progress(title, existing_score, _ranking_count(session, user_id))

    ranked = _ranked_watched(
        session, user_id, excluding_title_id=title_id, enjoyed=enjoyed
    )
    if ranked:
        return RankingProgress(
            new_title=title,
            comparison_title=None,
            complete=False,
            comparison_number=1,
            estimated_comparisons=max(1, math.ceil(math.log2(len(ranked) + 1))),
            total_ranked=len(ranked),
        )

    ranking = _finalize_ranking(
        session,
        user_id,
        title_id,
        insertion_index=0,
        ranked=ranked,
        enjoyed=enjoyed,
    )
    return _complete_progress(title, ranking, _ranking_count(session, user_id))


def get_next_comparison(
    session: Session,
    user: User,
    title_id: int,
    enjoyed: bool,
    excluded_title_ids: set[int] | None = None,
) -> RankingProgress:
    initial = start_ranking(session, user, title_id, enjoyed)
    if initial.complete:
        return initial

    user_id = _user_id(user)
    ranked = _ranked_watched(
        session, user_id, excluding_title_id=title_id, enjoyed=enjoyed
    )
    history = _comparison_history(session, user_id, title_id)
    low, high = _ranking_bounds(ranked, history, title_id)

    if low == high:
        ranking = _finalize_ranking(
            session,
            user_id,
            title_id,
            insertion_index=low,
            ranked=ranked,
            enjoyed=enjoyed,
        )
        return _complete_progress(
            initial.new_title, ranking, _ranking_count(session, user_id)
        )

    possible_indexes = list(range(low, high))
    midpoint = (low + high) // 2
    excluded = excluded_title_ids or set()
    available = [
        index for index in possible_indexes if ranked[index][1].id not in excluded
    ]
    candidate_index = min(available, key=lambda index: abs(index - midpoint)) if available else midpoint

    return RankingProgress(
        new_title=initial.new_title,
        comparison_title=ranked[candidate_index][1],
        complete=False,
        comparison_number=len(history) + 1,
        estimated_comparisons=max(1, math.ceil(math.log2(len(ranked) + 1))),
        total_ranked=len(ranked),
    )


def record_preference(
    session: Session,
    user: User,
    title_id: int,
    comparison_title_id: int,
    preferred_title_id: int,
    enjoyed: bool,
) -> RankingProgress:
    user_id = _user_id(user)
    if title_id == comparison_title_id:
        raise InvalidComparisonError("A title cannot be compared with itself")
    if preferred_title_id not in {title_id, comparison_title_id}:
        raise InvalidComparisonError("Preferred title must be one of the displayed titles")

    new_title = _watched_title(session, user_id, title_id)
    if session.get(Title, comparison_title_id) is None:
        raise RankingTitleNotFoundError
    existing_ranking = session.exec(
        select(Score).where(Score.user_id == user_id, Score.title_id == title_id)
    ).first()
    if existing_ranking is not None:
        raise InvalidComparisonError("This title's ranking is already complete")
    ranked = _ranked_watched(
        session, user_id, excluding_title_id=title_id, enjoyed=enjoyed
    )
    history = _comparison_history(session, user_id, title_id)
    low, high = _ranking_bounds(ranked, history, title_id)
    valid_ids = {
        ranked[index][1].id
        for index in range(low, high)
        if ranked[index][1].id is not None
    }
    if comparison_title_id not in valid_ids:
        raise InvalidComparisonError("Comparison title is not valid for this ranking step")
    if any(item.other_title_id == comparison_title_id for item in history):
        raise InvalidComparisonError("This comparison has already been recorded")

    session.add(
        Comparison(
            user_id=user_id,
            new_title_id=title_id,
            other_title_id=comparison_title_id,
            preferred_title_id=preferred_title_id,
        )
    )
    session.commit()
    return get_next_comparison(
        session, user, new_title.id or title_id, enjoyed
    )


def record_too_tough(
    session: Session,
    user: User,
    title_id: int,
    comparison_title_id: int,
    enjoyed: bool,
) -> RankingProgress:
    """Resolve an exhausted neutral comparison without declaring a winner."""
    user_id = _user_id(user)
    if title_id == comparison_title_id:
        raise InvalidComparisonError("A title cannot be compared with itself")

    new_title = _watched_title(session, user_id, title_id)
    if session.get(Title, comparison_title_id) is None:
        raise RankingTitleNotFoundError
    if session.exec(
        select(Score).where(Score.user_id == user_id, Score.title_id == title_id)
    ).first() is not None:
        raise InvalidComparisonError("This title's ranking is already complete")

    ranked = _ranked_watched(
        session, user_id, excluding_title_id=title_id, enjoyed=enjoyed
    )
    history = _comparison_history(session, user_id, title_id)
    low, high = _ranking_bounds(ranked, history, title_id)
    candidate_index = next(
        (
            index
            for index in range(low, high)
            if ranked[index][1].id == comparison_title_id
        ),
        None,
    )
    if candidate_index is None:
        raise InvalidComparisonError("Comparison title is not valid for this ranking step")

    # Too Tough is uncertainty, not equality. When the client has no other
    # candidates left, place the title near the middle of the remaining range
    # and calculate its own score from the surrounding titles.
    neutral_index = (low + high) // 2
    ranking = _finalize_ranking(
        session,
        user_id,
        title_id,
        neutral_index,
        ranked,
        enjoyed,
    )
    return _complete_progress(new_title, ranking, _ranking_count(session, user_id))


def set_manual_score(
    session: Session,
    user: User,
    title_id: int,
    score: float,
) -> Score:
    """Override one rating without recalculating any of the user's other scores."""
    user_id = _user_id(user)
    _watched_title(session, user_id, title_id)
    ranking = session.exec(
        select(Score).where(Score.user_id == user_id, Score.title_id == title_id)
    ).first()
    if ranking is None:
        raise TitleNotWatchedError
    ranking.score = round(min(10.0, max(1.0, score)), 1)
    ranking.updated_at = datetime.now(timezone.utc)
    session.add(ranking)
    session.flush()
    _refresh_rank_positions(session, user_id, ranking.updated_at)
    session.commit()
    session.refresh(ranking)
    return ranking


def _ranking_bounds(
    ranked: list[tuple[Score, Title]],
    history: list[Comparison],
    new_title_id: int,
) -> tuple[int, int]:
    indexes = {title.id: index for index, (_, title) in enumerate(ranked)}
    low, high = 0, len(ranked)
    for comparison in history:
        index = indexes.get(comparison.other_title_id)
        if index is None or not (low <= index < high):
            continue
        if comparison.preferred_title_id == new_title_id:
            high = index
        else:
            low = index + 1
    return low, high


def _finalize_ranking(
    session: Session,
    user_id: int,
    title_id: int,
    insertion_index: int,
    ranked: list[tuple[Score, Title]],
    enjoyed: bool,
    forced_score: float | None = None,
    rank_hint: int | None = None,
) -> Score:
    now = datetime.now(timezone.utc)
    score = forced_score if forced_score is not None else _score_for_insertion(
        ranked, insertion_index, enjoyed
    )
    if rank_hint is None:
        if insertion_index < len(ranked):
            rank_hint = ranked[insertion_index][0].rank_position
        elif ranked:
            rank_hint = ranked[-1][0].rank_position + 1
        else:
            rank_hint = _ranking_count(session, user_id) + 1
    new_ranking = Score(
        user_id=user_id,
        title_id=title_id,
        rank_position=rank_hint,
        score=round(score, 1),
        updated_at=now,
    )
    session.add(new_ranking)
    session.flush()
    _refresh_rank_positions(session, user_id, now)
    session.commit()
    session.refresh(new_ranking)
    return new_ranking


def _score_for_insertion(
    ranked: list[tuple[Score, Title]],
    insertion_index: int,
    enjoyed: bool,
) -> float:
    """Choose a score for only the new title; existing scores never move."""
    minimum = ENJOYED_MIN_SCORE if enjoyed else 1.0
    maximum = 10.0 if enjoyed else NOT_ENJOYED_MAX_SCORE
    default = ENJOYED_DEFAULT_SCORE if enjoyed else NOT_ENJOYED_DEFAULT_SCORE
    if not ranked:
        return default

    if insertion_index <= 0:
        return min(maximum, ranked[0][0].score + SCORE_STEP)
    if insertion_index >= len(ranked):
        return max(minimum, ranked[-1][0].score - SCORE_STEP)

    above = ranked[insertion_index - 1][0].score
    below = ranked[insertion_index][0].score
    return min(maximum, max(minimum, round((above + below) / 2, 1)))


def _refresh_rank_positions(session: Session, user_id: int, now: datetime) -> None:
    """Refresh display positions while preserving every stored personal score."""
    rankings = list(
        session.exec(
            select(Score)
            .where(Score.user_id == user_id)
            .order_by(Score.score.desc(), Score.rank_position, Score.id)
        ).all()
    )
    for position, ranking in enumerate(rankings, start=1):
        ranking.rank_position = position
        ranking.updated_at = now
        session.add(ranking)


def _ranked_watched(
    session: Session,
    user_id: int,
    excluding_title_id: int,
    enjoyed: bool,
) -> list[tuple[Score, Title]]:
    statement = (
        select(Score, Title)
            .join(Title, Score.title_id == Title.id)
            .join(
                Event,
                (Event.title_id == Title.id) & (Event.user_id == user_id),
            )
            .where(
                Score.user_id == user_id,
                Score.title_id != excluding_title_id,
                Event.event_type == EventType.WATCHED,
            )
            .order_by(Score.score.desc(), Score.rank_position, Score.id)
    )
    if enjoyed:
        statement = statement.where(Score.score >= ENJOYED_MIN_SCORE)
    else:
        statement = statement.where(Score.score < ENJOYED_MIN_SCORE)
    return list(session.exec(statement).all())


def _comparison_history(
    session: Session,
    user_id: int,
    title_id: int,
) -> list[Comparison]:
    return list(
        session.exec(
            select(Comparison)
            .where(
                Comparison.user_id == user_id,
                Comparison.new_title_id == title_id,
            )
            .order_by(Comparison.created_at, Comparison.id)
        ).all()
    )


def _watched_title(session: Session, user_id: int, title_id: int) -> Title:
    title = session.get(Title, title_id)
    if title is None:
        raise RankingTitleNotFoundError
    event = session.exec(
        select(Event).where(Event.user_id == user_id, Event.title_id == title_id)
    ).first()
    if event is None or event.event_type != EventType.WATCHED:
        raise TitleNotWatchedError
    return title


def _ranking_count(session: Session, user_id: int) -> int:
    return len(session.exec(select(Score).where(Score.user_id == user_id)).all())


def _complete_progress(title: Title, ranking: Score, total: int) -> RankingProgress:
    return RankingProgress(
        new_title=title,
        comparison_title=None,
        complete=True,
        rank_position=ranking.rank_position,
        score=ranking.score,
        total_ranked=total,
    )


def _user_id(user: User) -> int:
    if user.id is None:
        raise RuntimeError("Current user must be persisted before ranking titles")
    return user.id
