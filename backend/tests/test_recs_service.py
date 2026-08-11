import unittest

from sqlmodel import Session, create_engine

from app.models.enums import EventType
from app.models.event import Event
from app.models.friendship import Friendship
from app.models.score import Score
from app.models.title import Title
from app.models.user import User
from app.services.recs_service import get_recommendations
from app.services.tmdb_service import MediaType, TmdbTitle


class FakeCatalog:
    def __init__(self) -> None:
        self.details: dict[tuple[str, int], TmdbTitle] = {}
        self.discovery: dict[str, list[TmdbTitle]] = {"movie": [], "tv": []}
        self.trending: list[TmdbTitle] = []
        self.requested_pages: list[int] = []

    def get_title_details(self, media_type: MediaType, tmdb_id: int) -> TmdbTitle:
        return self.details[(media_type, tmdb_id)]

    def discover_titles(
        self, media_type: MediaType, genre_ids: list[int], page: int = 1
    ) -> list[TmdbTitle]:
        self.requested_pages.append(page)
        return self.discovery[media_type]

    def get_trending_titles(self, page: int = 1) -> list[TmdbTitle]:
        self.requested_pages.append(page)
        return self.trending


def external_title(
    tmdb_id: int,
    name: str,
    genre_ids: list[int],
    popularity: float = 50.0,
) -> TmdbTitle:
    return TmdbTitle(
        tmdb_id=tmdb_id,
        type="movie",
        name=name,
        year=2020,
        poster_url=f"https://image.tmdb.org/t/p/w500/{tmdb_id}.jpg",
        overview=None,
        genre_ids=genre_ids,
        genres=[],
        popularity=popularity,
    )


class RecommendationServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine("sqlite://")
        User.__table__.create(self.engine)
        Title.__table__.create(self.engine)
        Event.__table__.create(self.engine)
        Score.__table__.create(self.engine)
        Friendship.__table__.create(self.engine)

    def _seed_ranked_user(self, session: Session) -> tuple[User, FakeCatalog]:
        user = User(supabase_sub="recs-user", username="recsuser")
        dune = Title(tmdb_id=438631, name="Dune", type="movie", year=2021)
        interstellar = Title(tmdb_id=157336, name="Interstellar", type="movie", year=2014)
        saved_candidate = Title(
            tmdb_id=335984,
            name="Blade Runner 2049",
            type="movie",
            year=2017,
        )
        session.add(user)
        session.add(dune)
        session.add(interstellar)
        session.add(saved_candidate)
        session.commit()
        for item in (user, dune, interstellar, saved_candidate):
            session.refresh(item)

        session.add(Event(user_id=user.id, title_id=dune.id, event_type=EventType.WATCHED))  # type: ignore[arg-type]
        session.add(Event(user_id=user.id, title_id=interstellar.id, event_type=EventType.WATCHED))  # type: ignore[arg-type]
        session.add(Event(user_id=user.id, title_id=saved_candidate.id, event_type=EventType.WANT))  # type: ignore[arg-type]
        session.add(Score(user_id=user.id, title_id=dune.id, rank_position=1, score=9.2))  # type: ignore[arg-type]
        session.add(Score(user_id=user.id, title_id=interstellar.id, rank_position=2, score=8.8))  # type: ignore[arg-type]
        session.commit()

        catalog = FakeCatalog()
        catalog.details[("movie", 438631)] = TmdbTitle(
            tmdb_id=438631,
            type="movie",
            name="Dune",
            year=2021,
            poster_url="dune.jpg",
            overview=None,
            genre_ids=[878, 12],
            genres=["Science Fiction", "Adventure"],
        )
        catalog.details[("movie", 157336)] = TmdbTitle(
            tmdb_id=157336,
            type="movie",
            name="Interstellar",
            year=2014,
            poster_url="interstellar.jpg",
            overview=None,
            genre_ids=[878, 18, 12],
            genres=["Science Fiction", "Drama", "Adventure"],
        )
        catalog.discovery["movie"] = [
            external_title(438631, "Dune", [878, 12], 100),
            external_title(335984, "Blade Runner 2049", [878, 12], 95),
            external_title(286217, "The Martian", [878, 18, 12], 70),
            external_title(264660, "Ex Machina", [878, 18], 65),
            external_title(999, "Unrelated Romance", [10749], 500),
        ]
        return user, catalog

    def test_excludes_watched_want_and_source_titles(self) -> None:
        with Session(self.engine) as session:
            user, catalog = self._seed_ranked_user(session)
            recommendations = get_recommendations(session, user, 20, catalog)
            ids = {item.title.tmdb_id for item in recommendations}

            self.assertNotIn(438631, ids)
            self.assertNotIn(157336, ids)
            self.assertNotIn(335984, ids)

    def test_orders_genre_matches_and_returns_reasons(self) -> None:
        with Session(self.engine) as session:
            user, catalog = self._seed_ranked_user(session)
            recommendations = get_recommendations(session, user, 20, catalog)

            self.assertEqual(recommendations[0].title.name, "The Martian")
            self.assertEqual(recommendations[1].title.name, "Ex Machina")
            self.assertTrue(
                all(item.reason.startswith("Because you liked ") for item in recommendations[:2])
            )
            self.assertTrue(all(item.reason for item in recommendations))

    def test_new_user_gets_unseen_trending_fallback(self) -> None:
        with Session(self.engine) as session:
            user = User(supabase_sub="new-user", username="newuser")
            session.add(user)
            session.commit()
            session.refresh(user)
            catalog = FakeCatalog()
            catalog.trending = [external_title(1, "Trending Title", [18])]

            recommendations = get_recommendations(session, user, 20, catalog)

            self.assertEqual(len(recommendations), 1)
            self.assertEqual(recommendations[0].reason, "Popular on TMDb")

    def test_requested_page_is_forwarded_to_tmdb(self) -> None:
        with Session(self.engine) as session:
            user = User(supabase_sub="paged-user", username="pageduser")
            session.add(user)
            session.commit()
            session.refresh(user)
            catalog = FakeCatalog()

            get_recommendations(session, user, 20, catalog, page=3)

            self.assertEqual(catalog.requested_pages, [3])

    def test_friend_activity_is_a_secondary_fallback_signal(self) -> None:
        with Session(self.engine) as session:
            user = User(supabase_sub="friend-recs-user", username="friendrecs")
            friend = User(supabase_sub="friend-user", username="frienduser")
            friend_title = Title(
                tmdb_id=500,
                name="Friend Favorite",
                type="movie",
                year=2022,
            )
            session.add(user)
            session.add(friend)
            session.add(friend_title)
            session.commit()
            for item in (user, friend, friend_title):
                session.refresh(item)
            session.add(Friendship(user_id=user.id, friend_id=friend.id))  # type: ignore[arg-type]
            session.add(
                Event(
                    user_id=friend.id,  # type: ignore[arg-type]
                    title_id=friend_title.id,  # type: ignore[arg-type]
                    event_type=EventType.WATCHED,
                )
            )
            session.add(
                Score(
                    user_id=friend.id,  # type: ignore[arg-type]
                    title_id=friend_title.id,  # type: ignore[arg-type]
                    rank_position=1,
                    score=9.5,
                )
            )
            session.commit()
            catalog = FakeCatalog()
            catalog.trending = [
                external_title(501, "General Trend", [18], 0),
                external_title(500, "Friend Favorite", [18], 0),
            ]

            recommendations = get_recommendations(session, user, 20, catalog)

            self.assertEqual(recommendations[0].title.name, "Friend Favorite")
            self.assertEqual(recommendations[0].reason, "Popular among friends")


if __name__ == "__main__":
    unittest.main()
