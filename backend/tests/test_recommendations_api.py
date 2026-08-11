from fastapi.testclient import TestClient

from app.api import recommendations as recommendations_api
from app.services.recs_service import Recommendation
from app.services.tmdb_service import TmdbTitle


def candidate(tmdb_id: int, name: str) -> Recommendation:
    return Recommendation(
        title=TmdbTitle(
            tmdb_id=tmdb_id,
            type="movie",
            name=name,
            year=2024,
            poster_url=None,
            overview=None,
            genre_ids=[878],
            genres=["Science Fiction"],
        ),
        reason="Because you liked Dune",
        relevance=float(100 - tmdb_id),
    )


def test_recommendations_endpoint_respects_limit_without_tmdb_network(
    authenticated_client: TestClient,
    monkeypatch,
) -> None:
    fixed = [candidate(1, "Title A"), candidate(2, "Title B"), candidate(3, "Title C")]

    def fake_recommendations(session, user, *, limit: int, page: int):
        return fixed[:limit]

    monkeypatch.setattr(
        recommendations_api,
        "get_recommendations",
        fake_recommendations,
    )

    response = authenticated_client.get("/me/recs?limit=2")

    assert response.status_code == 200
    assert [item["name"] for item in response.json()] == ["Title A", "Title B"]
    assert all(item["reason"] == "Because you liked Dune" for item in response.json())


def test_recommendations_endpoint_validates_limit(
    authenticated_client: TestClient,
) -> None:
    response = authenticated_client.get("/me/recs?limit=1000")

    assert response.status_code == 422
