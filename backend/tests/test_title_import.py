import unittest

from sqlmodel import Session, create_engine, select

from app.models.activity import Activity
from app.models.enums import EventType
from app.models.event import Event
from app.models.score import Score
from app.models.title import Title
from app.models.user import User
from app.services.events_service import create_event, get_user_list
from app.services.titles_service import import_tmdb_title
from app.services.tmdb_service import TmdbTitle


class TitleImportTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine("sqlite://")
        User.__table__.create(self.engine)
        Title.__table__.create(self.engine)
        Event.__table__.create(self.engine)
        Activity.__table__.create(self.engine)
        Score.__table__.create(self.engine)

    def _dune(self, media_type: str = "movie") -> TmdbTitle:
        return TmdbTitle(
            tmdb_id=438631,
            type=media_type,  # type: ignore[arg-type]
            name="Dune",
            year=2021,
            poster_url="https://image.tmdb.org/t/p/w500/dune.jpg",
            overview="A journey across Arrakis.",
            genre_ids=[878, 12],
            genres=["Science Fiction", "Adventure"],
            runtime_minutes=155,
        )

    def test_import_saves_metadata_and_reuses_existing_title(self) -> None:
        with Session(self.engine) as session:
            first = import_tmdb_title(session, self._dune())
            second = import_tmdb_title(session, self._dune())
            titles = session.exec(select(Title)).all()

            self.assertEqual(first.id, second.id)
            self.assertEqual(len(titles), 1)
            self.assertEqual(titles[0].genres, "Science Fiction,Adventure")
            self.assertEqual(titles[0].runtime_minutes, 155)

    def test_same_tmdb_id_can_exist_once_per_media_type(self) -> None:
        with Session(self.engine) as session:
            movie = import_tmdb_title(session, self._dune("movie"))
            tv = import_tmdb_title(session, self._dune("tv"))

            self.assertNotEqual(movie.id, tv.id)
            self.assertEqual(len(session.exec(select(Title)).all()), 2)

    def test_external_title_can_be_saved_to_the_users_watched_list(self) -> None:
        with Session(self.engine) as session:
            user = User(supabase_sub="test-user", username="watchdtester")
            session.add(user)
            session.commit()
            session.refresh(user)
            title = import_tmdb_title(session, self._dune())

            event, _ = create_event(session, user, title.id, EventType.WATCHED)  # type: ignore[arg-type]
            watched = get_user_list(session, user)[EventType.WATCHED]

            self.assertEqual(event.title_id, title.id)
            self.assertEqual(len(watched), 1)
            self.assertEqual(watched[0][1].name, "Dune")


if __name__ == "__main__":
    unittest.main()
