from enum import Enum

class EventType(str, Enum):
    """
    Types of user-title events.
    Used by Event.event_type.
    """

    WANT = "WANT"
    WATCHED = "WATCHED"
    WATCHING = "WATCHING"


class ActivityType(str, Enum):
    """
    Types of activities that appear in the feed.
    Used by Activity.activity_type.
    """

    EVENT_CREATED = "EVENT_CREATED"
    COMPARE_MADE = "COMPARE_MADE"
    FRIEND_ADDED = "FRIEND_ADDED"
