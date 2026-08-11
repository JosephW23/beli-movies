from collections import defaultdict
from dataclasses import dataclass
from typing import Protocol

from sqlalchemy import or_
from sqlmodel import Session, select

from app.models.enums import EventType
from app.models.event import Event
from app.models.friendship import Friendship
from app.models.score import Score
from app.models.title import Title
from app.models.user import User
from app.services.tmdb_service import MediaType, TmdbService, TmdbTitle


class RecommendationCatalog(Protocol):
    def get_title_details(self, media_type: MediaType, tmdb_id: int) -> TmdbTitle: ...

    def discover_titles(
        self, media_type: MediaType, genre_ids: list[int], page: int = 1
    ) -> list[TmdbTitle]: ...

    def get_trending_titles(self, page: int = 1) -> list[TmdbTitle]: ...


@dataclass(frozen=True)
class Recommendation:
    title: TmdbTitle
    reason: str
    relevance: float


@dataclass(frozen=True)
class RankedSource:
    title: Title
    score: float
    details: TmdbTitle


def get_recommendations(
    session: Session,
    user: User,
    limit: int = 20,
    catalog: RecommendationCatalog | None = None,
    page: int = 1,
) -> list[Recommendation]:
    """Return ranked, unseen TMDb titles with short human-readable reasons."""
    if user.id is None:
        raise RuntimeError("Current user must be persisted")
    limit = min(max(limit, 1), 50)
    page = min(max(page, 1), 500)
    tmdb = catalog or TmdbService()
    excluded = _interaction_sources(session, user.id)
    source_rows = session.exec(
        select(Score, Title)
        .join(Title, Score.title_id == Title.id)
        .where(Score.user_id == user.id, Title.tmdb_id.is_not(None))
        .order_by(Score.score.desc(), Score.rank_position)
        .limit(8)
    ).all()
    influential_rows = [row for row in source_rows if row[0].score >= 7.0][:5]
    if not influential_rows and source_rows:
        influential_rows = [source_rows[0]]

    sources: list[RankedSource] = []
    for score, title in influential_rows:
        if title.tmdb_id is None or title.type not in ("movie", "tv"):
            continue
        details = tmdb.get_title_details(title.type, title.tmdb_id)
        sources.append(RankedSource(title=title, score=score.score, details=details))
        excluded.add((title.type, title.tmdb_id))

    friend_boosts = _friend_signals(session, user.id)
    if not sources:
        return _rank_candidates(
            tmdb.get_trending_titles(page),
            sources=[],
            excluded=excluded,
            friend_boosts=friend_boosts,
            limit=limit,
        )

    genre_weights: dict[tuple[str, int], float] = defaultdict(float)
    for source in sources:
        for genre_id in source.details.genre_ids:
            genre_weights[(source.details.type, genre_id)] += source.score

    candidates: list[TmdbTitle] = []
    for media_type in ("movie", "tv"):
        top_genres = sorted(
            (
                (genre_id, weight)
                for (genre_type, genre_id), weight in genre_weights.items()
                if genre_type == media_type
            ),
            key=lambda item: item[1],
            reverse=True,
        )[:3]
        if top_genres:
            candidates.extend(
                tmdb.discover_titles(
                    media_type,
                    [genre_id for genre_id, _ in top_genres],
                    page=page,
                )
            )

    if not candidates:
        candidates = tmdb.get_trending_titles(page)
    return _rank_candidates(candidates, sources, excluded, friend_boosts, limit)


def _rank_candidates(
    candidates: list[TmdbTitle],
    sources: list[RankedSource],
    excluded: set[tuple[str, int]],
    friend_boosts: dict[tuple[str, int], float],
    limit: int,
) -> list[Recommendation]:
    genre_names = {
        (source.details.type, genre_id): genre_name
        for source in sources
        for genre_id, genre_name in zip(source.details.genre_ids, source.details.genres)
    }
    best_by_key: dict[tuple[str, int], Recommendation] = {}
    for candidate in candidates:
        key = (candidate.type, candidate.tmdb_id)
        if key in excluded:
            continue

        best_source: RankedSource | None = None
        best_source_signal = 0.0
        total_genre_signal = 0.0
        candidate_genres = set(candidate.genre_ids)
        for source in sources:
            overlap = candidate_genres.intersection(source.details.genre_ids)
            if not overlap:
                continue
            signal = (source.score / 10.0) * (2.0 * len(overlap))
            total_genre_signal += signal
            if signal > best_source_signal:
                best_source_signal = signal
                best_source = source

        friend_signal = friend_boosts.get(key, 0.0)
        relevance = (
            best_source_signal
            + total_genre_signal * 0.45
            + min(friend_signal, 1.25)
            + min(candidate.popularity / 250.0, 0.6)
            + (0.15 if candidate.poster_url else 0.0)
        )
        if best_source is not None:
            reason = f"Because you liked {best_source.title.name}"
        elif friend_signal > 0:
            reason = "Popular among friends"
        elif sources and candidate.genre_ids:
            genre_name = next(
                (
                    genre_names[(candidate.type, genre_id)]
                    for genre_id in candidate.genre_ids
                    if (candidate.type, genre_id) in genre_names
                ),
                None,
            )
            reason = f"Because you like {genre_name.lower()}" if genre_name else "Matches your taste"
        else:
            reason = "Popular on TMDb"

        recommendation = Recommendation(candidate, reason, relevance)
        existing = best_by_key.get(key)
        if existing is None or recommendation.relevance > existing.relevance:
            best_by_key[key] = recommendation

    return sorted(
        best_by_key.values(),
        key=lambda item: (item.relevance, item.title.popularity),
        reverse=True,
    )[:limit]


def _interaction_sources(session: Session, user_id: int) -> set[tuple[str, int]]:
    rows = session.exec(
        select(Event, Title)
        .join(Title, Event.title_id == Title.id)
        .where(Event.user_id == user_id)
    ).all()
    return {
        (title.type, title.tmdb_id)
        for _, title in rows
        if title.tmdb_id is not None
    }


def _friend_signals(session: Session, user_id: int) -> dict[tuple[str, int], float]:
    friendships = session.exec(
        select(Friendship).where(
            or_(Friendship.user_id == user_id, Friendship.friend_id == user_id)
        )
    ).all()
    friend_ids = {
        friendship.friend_id if friendship.user_id == user_id else friendship.user_id
        for friendship in friendships
    }
    if not friend_ids:
        return {}

    rows = session.exec(
        select(Event, Title, Score)
        .join(Title, Event.title_id == Title.id)
        .outerjoin(
            Score,
            (Score.user_id == Event.user_id) & (Score.title_id == Event.title_id),
        )
        .where(
            Event.user_id.in_(friend_ids),
            Event.event_type == EventType.WATCHED,
            Title.tmdb_id.is_not(None),
        )
    ).all()
    signals: dict[tuple[str, int], float] = defaultdict(float)
    for _, title, score in rows:
        if title.tmdb_id is not None:
            signals[(title.type, title.tmdb_id)] += 0.35 + (
                max(score.score - 5.0, 0.0) / 10.0 if score else 0.0
            )
    return dict(signals)
