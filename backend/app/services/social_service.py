import json
from dataclasses import dataclass

from sqlalchemy import func, or_
from sqlmodel import Session, select

from app.models.activity import Activity
from app.core.usernames import normalize_username
from app.models.enums import EventType
from app.models.friendship import Friendship
from app.models.title import Title
from app.models.user import User


class FriendNotFoundError(Exception):
    pass


class CannotAddSelfError(Exception):
    pass


class FriendshipAlreadyExistsError(Exception):
    pass


@dataclass(frozen=True)
class FeedRow:
    activity: Activity
    user: User
    title: Title
    status: EventType


def _require_user_id(user: User) -> int:
    if user.id is None:
        raise RuntimeError("Current user must be persisted")
    return user.id


def add_friend(session: Session, user: User, friend_username: str) -> User:
    """Create one mutual friendship connection using a public username."""
    user_id = _require_user_id(user)
    normalized_username = normalize_username(friend_username)
    friend = session.exec(
        select(User).where(
            User.username.is_not(None),
            func.lower(User.username) == normalized_username,
        )
    ).first()

    if friend is None or friend.id is None:
        raise FriendNotFoundError
    if friend.id == user_id:
        raise CannotAddSelfError

    existing = session.exec(
        select(Friendship).where(
            or_(
                (Friendship.user_id == user_id) & (Friendship.friend_id == friend.id),
                (Friendship.user_id == friend.id) & (Friendship.friend_id == user_id),
            )
        )
    ).first()
    if existing is not None:
        raise FriendshipAlreadyExistsError

    session.add(Friendship(user_id=user_id, friend_id=friend.id))
    session.commit()
    return friend


def get_friends(session: Session, user: User) -> list[User]:
    """Return both sides of the current user's mutual connections."""
    user_id = _require_user_id(user)
    friendships = session.exec(
        select(Friendship).where(
            or_(Friendship.user_id == user_id, Friendship.friend_id == user_id)
        )
    ).all()
    friend_ids = {
        friendship.friend_id
        if friendship.user_id == user_id
        else friendship.user_id
        for friendship in friendships
    }
    if not friend_ids:
        return []

    return list(
        session.exec(
            select(User).where(User.id.in_(friend_ids)).order_by(User.username)
        ).all()
    )


def get_feed(session: Session, user: User, limit: int = 30) -> list[FeedRow]:
    """Return newest title activity from the current user and their friends."""
    user_id = _require_user_id(user)
    feed_user_ids = {user_id, *(friend.id for friend in get_friends(session, user) if friend.id)}
    rows = session.exec(
        select(Activity, User, Title)
        .join(User, Activity.user_id == User.id)
        .join(Title, Activity.title_id == Title.id)
        .where(Activity.user_id.in_(feed_user_ids))
        .order_by(Activity.created_at.desc())
        .limit(limit)
    ).all()

    feed: list[FeedRow] = []
    for activity, actor, title in rows:
        try:
            metadata = json.loads(activity.metadata_json or "{}")
            status = EventType(metadata["status"])
        except (json.JSONDecodeError, KeyError, ValueError, TypeError):
            continue
        feed.append(FeedRow(activity=activity, user=actor, title=title, status=status))
    return feed
