import unittest

from sqlmodel import Session, create_engine

from app.models.enums import EventType
from app.models.event import Event
from app.models.review import Review
from app.models.score import Score
from app.models.title import Title
from app.models.user import User
from app.services.reviews_service import get_user_reviews, upsert_review


class ReviewServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine("sqlite://")
        User.__table__.create(self.engine)
        Title.__table__.create(self.engine)
        Event.__table__.create(self.engine)
        Score.__table__.create(self.engine)
        Review.__table__.create(self.engine)

    def test_review_can_be_created_and_edited_for_watched_title(self) -> None:
        with Session(self.engine) as session:
            user = User(supabase_sub="review-user", username="reviewuser")
            title = Title(name="A Movie", type="movie")
            session.add(user)
            session.add(title)
            session.commit()
            session.refresh(user)
            session.refresh(title)
            session.add(Event(user_id=user.id, title_id=title.id, event_type=EventType.WATCHED))  # type: ignore[arg-type]
            session.add(Score(user_id=user.id, title_id=title.id, rank_position=1, score=8.4))  # type: ignore[arg-type]
            session.commit()

            first = upsert_review(session, user, title.id, " Really good. ")  # type: ignore[arg-type]
            edited = upsert_review(session, user, title.id, "Even better on rewatch.")  # type: ignore[arg-type]
            reviews = get_user_reviews(session, user)

            self.assertEqual(first.id, edited.id)
            self.assertEqual(edited.body, "Even better on rewatch.")
            self.assertEqual(len(reviews), 1)
            self.assertEqual(reviews[0][2].score, 8.4)  # type: ignore[union-attr]


if __name__ == "__main__":
    unittest.main()
