import json
import unittest
from datetime import datetime, timedelta, timezone

from sqlmodel import Session, create_engine

from app.models.activity import Activity
from app.models.enums import ActivityType, EventType
from app.models.event import Event
from app.models.friendship import Friendship
from app.models.score import Score
from app.models.title import Title
from app.models.user import User
from app.services.social_service import get_feed
from app.services.titles_service import search_titles


class PerformanceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine("sqlite://")
        User.__table__.create(self.engine)
        Title.__table__.create(self.engine)
        Event.__table__.create(self.engine)
        Score.__table__.create(self.engine)
        Friendship.__table__.create(self.engine)
        Activity.__table__.create(self.engine)

    def test_required_compound_indexes_are_registered(self) -> None:
        expected = {
            "event": "ix_event_user_title",
            "score": "ix_score_user_title",
            "friendship": "ix_friendship_user_friend",
            "activity": "ix_activity_user_created_at",
        }

        for table_name, index_name in expected.items():
            index_names = {
                index.name for index in Event.metadata.tables[table_name].indexes
            }
            self.assertIn(index_name, index_names)

    def test_titles_are_paginated_without_duplicates(self) -> None:
        with Session(self.engine) as session:
            session.add_all(
                [Title(name=f"Title {number:02d}", type="movie") for number in range(25)]
            )
            session.commit()

            first, total = search_titles(session, None, None, limit=20, offset=0)
            second, second_total = search_titles(
                session, None, None, limit=20, offset=20
            )

            self.assertEqual(total, 25)
            self.assertEqual(second_total, 25)
            self.assertEqual(len(first), 20)
            self.assertEqual(len(second), 5)
            self.assertTrue({title.id for title in first}.isdisjoint(title.id for title in second))

    def test_feed_pages_remain_newest_first_without_duplicates(self) -> None:
        with Session(self.engine) as session:
            user = User(supabase_sub="feed-user", username="feeduser")
            friend = User(supabase_sub="feed-friend", username="feedfriend")
            title = Title(name="Feed Movie", type="movie")
            session.add_all([user, friend, title])
            session.commit()
            session.refresh(user)
            session.refresh(friend)
            session.refresh(title)
            session.add(Friendship(user_id=user.id, friend_id=friend.id))  # type: ignore[arg-type]

            start = datetime(2026, 1, 1, tzinfo=timezone.utc)
            for number in range(25):
                session.add(
                    Activity(
                        user_id=user.id if number % 2 == 0 else friend.id,  # type: ignore[arg-type]
                        title_id=title.id,
                        activity_type=ActivityType.EVENT_CREATED,
                        metadata_json=json.dumps({"status": EventType.WATCHED.value}),
                        created_at=start + timedelta(minutes=number),
                    )
                )
            session.commit()

            first = get_feed(session, user, limit=20, offset=0)
            second = get_feed(session, user, limit=20, offset=20)

            first_ids = [row.activity.id for row in first]
            second_ids = [row.activity.id for row in second]
            self.assertEqual(len(first_ids), 20)
            self.assertEqual(len(second_ids), 5)
            self.assertTrue(set(first_ids).isdisjoint(second_ids))
            combined_dates = [row.activity.created_at for row in first + second]
            self.assertEqual(combined_dates, sorted(combined_dates, reverse=True))


if __name__ == "__main__":
    unittest.main()
