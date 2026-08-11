import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models.enums import EventType
from app.models.event import Event
from app.models.title import Title
from app.models.user import User


def add_title(session: Session, name: str) -> Title:
    title = Title(name=name, type="movie", year=2024)
    session.add(title)
    session.commit()
    session.refresh(title)
    return title


@pytest.mark.parametrize("event_status", ["WANT", "WATCHED", "WATCHING"])
def test_create_event_accepts_every_status(
    authenticated_client: TestClient,
    db_session: Session,
    test_user: User,
    event_status: str,
) -> None:
    title = add_title(db_session, f"{event_status} title")

    response = authenticated_client.post(
        "/events",
        json={"title_id": title.id, "status": event_status},
    )

    assert response.status_code == 201
    assert response.json()["title_id"] == title.id
    assert response.json()["status"] == event_status
    saved = db_session.exec(
        select(Event).where(
            Event.user_id == test_user.id,
            Event.title_id == title.id,
        )
    ).one()
    assert saved.event_type == EventType(event_status)


def test_create_event_rejects_invalid_status(
    authenticated_client: TestClient,
    db_session: Session,
) -> None:
    title = add_title(db_session, "Invalid status title")

    response = authenticated_client.post(
        "/events",
        json={"title_id": title.id, "status": "LOVED"},
    )

    assert response.status_code == 422


def test_create_event_requires_authentication(client: TestClient) -> None:
    response = client.post("/events", json={"title_id": 1, "status": "WATCHED"})

    assert response.status_code == 401


def test_my_list_groups_titles_and_excludes_other_users(
    authenticated_client: TestClient,
    db_session: Session,
    test_user: User,
) -> None:
    dune = add_title(db_session, "Dune")
    interstellar = add_title(db_session, "Interstellar")
    the_bear = add_title(db_session, "The Bear")
    other_title = add_title(db_session, "Someone Else's Movie")
    other_user = User(supabase_sub="other-user", username="otherwatcher")
    db_session.add(other_user)
    db_session.commit()
    db_session.refresh(other_user)
    db_session.add_all(
        [
            Event(user_id=test_user.id, title_id=dune.id, event_type=EventType.WANT),
            Event(user_id=test_user.id, title_id=interstellar.id, event_type=EventType.WATCHED),
            Event(user_id=test_user.id, title_id=the_bear.id, event_type=EventType.WATCHING),
            Event(user_id=other_user.id, title_id=other_title.id, event_type=EventType.WATCHED),
        ]
    )
    db_session.commit()

    response = authenticated_client.get("/me/list")

    assert response.status_code == 200
    body = response.json()
    assert [item["name"] for item in body["want_to_watch"]] == ["Dune"]
    assert [item["name"] for item in body["watched"]] == ["Interstellar"]
    returned_names = {
        item["name"]
        for group in (body["want_to_watch"], body["watched"])
        for item in group
    }
    assert "The Bear" not in returned_names
    assert "Someone Else's Movie" not in returned_names


def test_my_list_is_empty_for_a_new_user(authenticated_client: TestClient) -> None:
    response = authenticated_client.get("/me/list")

    assert response.status_code == 200
    assert response.json() == {"want_to_watch": [], "watched": []}
