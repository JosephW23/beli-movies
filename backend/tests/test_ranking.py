import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models.enums import EventType
from app.models.event import Event
from app.models.score import Score
from app.models.title import Title
from app.models.user import User
from app.services.ranking_service import (
    get_next_comparison,
    record_preference,
    start_ranking,
)


def add_watched_title(session: Session, user: User, name: str) -> Title:
    title = Title(name=name, type="movie", year=2024)
    session.add(title)
    session.commit()
    session.refresh(title)
    session.add(
        Event(user_id=user.id, title_id=title.id, event_type=EventType.WATCHED)
    )
    session.commit()
    return title


def add_score(
    session: Session,
    user: User,
    title: Title,
    rank: int,
    score: float,
) -> None:
    session.add(
        Score(
            user_id=user.id,
            title_id=title.id,
            rank_position=rank,
            score=score,
        )
    )
    session.commit()


def test_first_ranked_title_gets_a_deterministic_score(
    db_session: Session,
    test_user: User,
) -> None:
    dune = add_watched_title(db_session, test_user, "Dune")

    result = start_ranking(db_session, test_user, dune.id, enjoyed=True)  # type: ignore[arg-type]

    assert result.complete is True
    assert result.rank_position == 1
    assert result.score == 7.5


@pytest.mark.parametrize(
    ("prefer_new", "expected_order", "expected_new_score"),
    [
        (True, ["Dune", "Interstellar"], 8.5),
        (False, ["Interstellar", "Dune"], 7.5),
    ],
)
def test_one_comparison_places_the_new_title_predictably(
    db_session: Session,
    test_user: User,
    prefer_new: bool,
    expected_order: list[str],
    expected_new_score: float,
) -> None:
    interstellar = add_watched_title(db_session, test_user, "Interstellar")
    dune = add_watched_title(db_session, test_user, "Dune")
    add_score(db_session, test_user, interstellar, 1, 8.0)

    result = record_preference(
        db_session,
        test_user,
        dune.id,  # type: ignore[arg-type]
        interstellar.id,  # type: ignore[arg-type]
        dune.id if prefer_new else interstellar.id,  # type: ignore[arg-type]
        enjoyed=True,
    )

    assert result.complete is True
    assert result.score == expected_new_score
    rows = db_session.exec(
        select(Score, Title)
        .join(Title, Score.title_id == Title.id)
        .where(Score.user_id == test_user.id)
        .order_by(Score.rank_position)
    ).all()
    assert [title.name for _, title in rows] == expected_order


def test_multi_comparison_places_title_between_known_scores(
    db_session: Session,
    test_user: User,
) -> None:
    ranked_data = [
        ("Interstellar", 9.6),
        ("The Dark Knight", 9.2),
        ("Oppenheimer", 8.4),
        ("Spider-Man", 8.0),
    ]
    ranked_titles: dict[str, Title] = {}
    for rank, (name, score) in enumerate(ranked_data, start=1):
        title = add_watched_title(db_session, test_user, name)
        add_score(db_session, test_user, title, rank, score)
        ranked_titles[name] = title
    dune = add_watched_title(db_session, test_user, "Dune")

    first_candidate = get_next_comparison(
        db_session, test_user, dune.id, enjoyed=True  # type: ignore[arg-type]
    )
    assert first_candidate.comparison_title is not None
    assert first_candidate.comparison_title.name == "Oppenheimer"
    assert first_candidate.comparison_title.id != dune.id

    second_step = record_preference(
        db_session,
        test_user,
        dune.id,  # type: ignore[arg-type]
        ranked_titles["Oppenheimer"].id,  # type: ignore[arg-type]
        dune.id,  # type: ignore[arg-type]
        enjoyed=True,
    )
    assert second_step.complete is False
    assert second_step.comparison_title is not None
    assert second_step.comparison_title.name == "The Dark Knight"

    result = record_preference(
        db_session,
        test_user,
        dune.id,  # type: ignore[arg-type]
        ranked_titles["The Dark Knight"].id,  # type: ignore[arg-type]
        ranked_titles["The Dark Knight"].id,  # type: ignore[arg-type]
        enjoyed=True,
    )

    assert result.complete is True
    assert result.score == 8.8
    rows = db_session.exec(
        select(Score, Title)
        .join(Title, Score.title_id == Title.id)
        .where(Score.user_id == test_user.id)
        .order_by(Score.rank_position)
    ).all()
    assert [title.name for _, title in rows] == [
        "Interstellar",
        "The Dark Knight",
        "Dune",
        "Oppenheimer",
        "Spider-Man",
    ]
    scores = [score.score for score, _ in rows]
    assert scores == sorted(scores, reverse=True)
    assert all(left > right for left, right in zip(scores, scores[1:]))


def test_compare_endpoint_rejects_invalid_preference(
    authenticated_client: TestClient,
    db_session: Session,
    test_user: User,
) -> None:
    new_title = add_watched_title(db_session, test_user, "New Title")
    other_title = add_watched_title(db_session, test_user, "Other Title")
    invalid_preferred = add_watched_title(db_session, test_user, "Not Displayed")
    add_score(db_session, test_user, other_title, 1, 8.0)

    response = authenticated_client.post(
        "/compare",
        json={
            "title_id": new_title.id,
            "comparison_title_id": other_title.id,
            "preferred_title_id": invalid_preferred.id,
            "enjoyed": True,
        },
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "Preferred title must be one of the displayed titles"


def test_compare_endpoint_rejects_comparing_title_with_itself(
    authenticated_client: TestClient,
    db_session: Session,
    test_user: User,
) -> None:
    title = add_watched_title(db_session, test_user, "Same Title")

    response = authenticated_client.post(
        "/compare",
        json={
            "title_id": title.id,
            "comparison_title_id": title.id,
            "preferred_title_id": title.id,
            "enjoyed": True,
        },
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "A title cannot be compared with itself"


def test_rankings_endpoint_orders_scores_and_isolates_users(
    authenticated_client: TestClient,
    db_session: Session,
    test_user: User,
) -> None:
    for rank, (name, score) in enumerate(
        [("Interstellar", 9.6), ("Dune", 8.8), ("Oppenheimer", 8.4)],
        start=1,
    ):
        title = add_watched_title(db_session, test_user, name)
        add_score(db_session, test_user, title, rank, score)

    other_user = User(supabase_sub="rank-other", username="rankother")
    db_session.add(other_user)
    db_session.commit()
    db_session.refresh(other_user)
    other_title = add_watched_title(db_session, other_user, "Other User Favorite")
    add_score(db_session, other_user, other_title, 1, 10.0)

    response = authenticated_client.get("/me/rankings?limit=20")

    assert response.status_code == 200
    body = response.json()
    assert [item["title_name"] for item in body] == [
        "Interstellar",
        "Dune",
        "Oppenheimer",
    ]
    assert [item["score"] for item in body] == [9.6, 8.8, 8.4]
    assert [item["rank"] for item in body] == [1, 2, 3]
