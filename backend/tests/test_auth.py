from fastapi.testclient import TestClient

from app.core import auth as auth_module


def test_me_requires_authentication(client: TestClient) -> None:
    response = client.get("/me")

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid or expired authentication token"


def test_me_returns_the_authenticated_user(authenticated_client: TestClient) -> None:
    response = authenticated_client.get("/me")

    assert response.status_code == 200
    assert response.json() == {
        "id": 1,
        "email": "watcher@example.test",
        "supabase_sub": "test-user-sub",
        "full_name": "Test Watcher",
        "username": "testwatcher",
    }


def test_me_rejects_an_invalid_token(client: TestClient, monkeypatch) -> None:
    def reject_token(_: str) -> dict:
        raise auth_module._unauthorized()

    monkeypatch.setattr(auth_module, "verify_token", reject_token)
    response = client.get("/me", headers={"Authorization": "Bearer invalid-token"})

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"
