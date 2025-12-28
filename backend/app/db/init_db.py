from sqlmodel import SQLModel
from app.db.session import engine

# IMPORTANT:
# These imports make sure SQLModel "registers" all tables
# before create_all() runs.
from app.models.user import User  # noqa: F401
from app.models.title import Title  # noqa: F401
from app.models.event import Event  # noqa: F401
from app.models.comparison import Comparison  # noqa: F401
from app.models.score import Score  # noqa: F401
from app.models.friendship import Friendship  # noqa: F401
from app.models.activity import Activity  # noqa: F401


def init_db() -> None:
    """
    Creates database tables for all SQLModel models.
    MVP approach: create tables directly on startup.
    """
    SQLModel.metadata.create_all(engine)
