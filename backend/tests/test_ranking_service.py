import unittest

from sqlmodel import Session, create_engine, select

from app.models.comparison import Comparison
from app.models.enums import EventType
from app.models.event import Event
from app.models.score import Score
from app.models.title import Title
from app.models.user import User
from app.services.ranking_service import (
    get_next_comparison,
    record_preference,
    record_too_tough,
    set_manual_score,
    start_ranking,
)


class RankingServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine("sqlite://")
        User.__table__.create(self.engine)
        Title.__table__.create(self.engine)
        Event.__table__.create(self.engine)
        Score.__table__.create(self.engine)
        Comparison.__table__.create(self.engine)

    def test_first_title_uses_enjoyment_range_instead_of_ten(self) -> None:
        with Session(self.engine) as session:
            user = User(supabase_sub="first-user", username="firstuser")
            liked = Title(name="Liked", type="movie")
            disliked = Title(name="Disliked", type="movie")
            session.add(user)
            session.add(liked)
            session.add(disliked)
            session.commit()
            session.refresh(user)
            session.refresh(liked)
            session.refresh(disliked)
            session.add(Event(user_id=user.id, title_id=liked.id, event_type=EventType.WATCHED))  # type: ignore[arg-type]
            session.add(Event(user_id=user.id, title_id=disliked.id, event_type=EventType.WATCHED))  # type: ignore[arg-type]
            session.commit()

            liked_result = start_ranking(session, user, liked.id, enjoyed=True)  # type: ignore[arg-type]
            disliked_result = start_ranking(session, user, disliked.id, enjoyed=False)  # type: ignore[arg-type]

            self.assertEqual(liked_result.score, 7.5)
            self.assertEqual(disliked_result.score, 3.5)

    def test_too_tough_uses_neutral_placement_without_forcing_a_tie(self) -> None:
        with Session(self.engine) as session:
            user = User(supabase_sub="ranking-user", username="rankinguser")
            first = Title(name="First", type="movie")
            new_title = Title(name="Close Call", type="movie")
            session.add(user)
            session.add(first)
            session.add(new_title)
            session.commit()
            session.refresh(user)
            session.refresh(first)
            session.refresh(new_title)

            session.add(Event(user_id=user.id, title_id=first.id, event_type=EventType.WATCHED))  # type: ignore[arg-type]
            session.add(Event(user_id=user.id, title_id=new_title.id, event_type=EventType.WATCHED))  # type: ignore[arg-type]
            session.add(Score(user_id=user.id, title_id=first.id, rank_position=1, score=8.0))  # type: ignore[arg-type]
            session.commit()

            result = record_too_tough(
                session,
                user,
                new_title.id,  # type: ignore[arg-type]
                first.id,  # type: ignore[arg-type]
                enjoyed=True,
            )
            scores = session.exec(
                select(Score).where(Score.user_id == user.id).order_by(Score.rank_position)
            ).all()

            self.assertTrue(result.complete)
            self.assertEqual(result.rank_position, 1)
            self.assertEqual(result.score, 8.5)
            self.assertEqual([score.score for score in scores], [8.5, 8.0])

    def test_new_insertion_does_not_change_existing_scores(self) -> None:
        with Session(self.engine) as session:
            user = User(supabase_sub="stable-user", username="stableuser")
            favorite = Title(name="Favorite", type="movie")
            good = Title(name="Good", type="movie")
            new_title = Title(name="New", type="movie")
            session.add(user)
            session.add(favorite)
            session.add(good)
            session.add(new_title)
            session.commit()
            session.refresh(user)
            session.refresh(favorite)
            session.refresh(good)
            session.refresh(new_title)
            for title in (favorite, good, new_title):
                session.add(Event(user_id=user.id, title_id=title.id, event_type=EventType.WATCHED))  # type: ignore[arg-type]
            session.add(Score(user_id=user.id, title_id=favorite.id, rank_position=1, score=9.2))  # type: ignore[arg-type]
            session.add(Score(user_id=user.id, title_id=good.id, rank_position=2, score=7.4))  # type: ignore[arg-type]
            session.commit()

            candidate = get_next_comparison(session, user, new_title.id, enjoyed=True)  # type: ignore[arg-type]
            self.assertFalse(candidate.complete)
            comparison = candidate.comparison_title
            self.assertIsNotNone(comparison)
            result = record_preference(
                session,
                user,
                new_title.id,  # type: ignore[arg-type]
                comparison.id,  # type: ignore[union-attr]
                new_title.id,  # type: ignore[arg-type]
                enjoyed=True,
            )
            if not result.complete:
                comparison = result.comparison_title
                self.assertIsNotNone(comparison)
                result = record_preference(
                    session,
                    user,
                    new_title.id,  # type: ignore[arg-type]
                    comparison.id,  # type: ignore[union-attr]
                    comparison.id,  # type: ignore[union-attr]
                    enjoyed=True,
                )

            saved = session.exec(
                select(Score).where(Score.user_id == user.id)
            ).all()
            by_title = {score.title_id: score.score for score in saved}
            self.assertEqual(by_title[favorite.id], 9.2)
            self.assertEqual(by_title[good.id], 7.4)
            self.assertGreaterEqual(by_title[new_title.id], 5.0)

    def test_manual_score_changes_only_the_selected_title_and_allows_ties(self) -> None:
        with Session(self.engine) as session:
            user = User(supabase_sub="manual-user", username="manualuser")
            first = Title(name="First", type="movie")
            second = Title(name="Second", type="movie")
            session.add(user)
            session.add(first)
            session.add(second)
            session.commit()
            session.refresh(user)
            session.refresh(first)
            session.refresh(second)
            session.add(Event(user_id=user.id, title_id=first.id, event_type=EventType.WATCHED))  # type: ignore[arg-type]
            session.add(Event(user_id=user.id, title_id=second.id, event_type=EventType.WATCHED))  # type: ignore[arg-type]
            session.add(Score(user_id=user.id, title_id=first.id, rank_position=1, score=8.1))  # type: ignore[arg-type]
            session.add(Score(user_id=user.id, title_id=second.id, rank_position=2, score=6.2))  # type: ignore[arg-type]
            session.commit()

            changed = set_manual_score(session, user, second.id, 8.1)  # type: ignore[arg-type]
            first_score = session.exec(
                select(Score).where(Score.user_id == user.id, Score.title_id == first.id)
            ).one()

            self.assertEqual(changed.score, 8.1)
            self.assertEqual(first_score.score, 8.1)


if __name__ == "__main__":
    unittest.main()
