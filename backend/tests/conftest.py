import os
from collections.abc import Iterator

# Tests must never require production credentials or connect to Supabase.
# Set isolated values before importing the application modules.
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["SUPABASE_JWKS_URL"] = "https://example.test/.well-known/jwks.json"
os.environ["SUPABASE_ISSUER"] = "https://example.test/auth/v1"
os.environ["SUPABASE_AUDIENCE"] = "authenticated"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.engine import Engine
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from app.core.auth import get_current_user
from app.db.session import get_session
from app.main import app
from app.models.user import User


@pytest.fixture
def test_engine() -> Iterator[Engine]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    yield engine
    SQLModel.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture
def db_session(test_engine: Engine) -> Iterator[Session]:
    with Session(test_engine) as session:
        yield session


@pytest.fixture
def test_user(db_session: Session) -> User:
    user = User(
        supabase_sub="test-user-sub",
        email="watcher@example.test",
        full_name="Test Watcher",
        username="testwatcher",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def client(test_engine: Engine) -> Iterator[TestClient]:
    def override_session() -> Iterator[Session]:
        with Session(test_engine) as session:
            yield session

    app.dependency_overrides[get_session] = override_session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def authenticated_client(client: TestClient, test_user: User) -> Iterator[TestClient]:
    app.dependency_overrides[get_current_user] = lambda: test_user
    yield client
    app.dependency_overrides.pop(get_current_user, None)
