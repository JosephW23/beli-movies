from sqlalchemy import text
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
from app.models.review import Review  # noqa: F401


def init_db() -> None:
    """
    Creates database tables for all SQLModel models.
    MVP approach: create tables directly on startup.
    """
    SQLModel.metadata.create_all(engine)

    # create_all does not add columns to tables that already exist. Keep this
    # small migration idempotent so pre-Day-6 user rows gain public identity.
    if engine.dialect.name == "postgresql":
        with engine.begin() as connection:
            connection.execute(
                text('ALTER TABLE "user" ADD COLUMN IF NOT EXISTS full_name VARCHAR')
            )
            connection.execute(
                text('ALTER TABLE "user" ADD COLUMN IF NOT EXISTS username VARCHAR')
            )
            connection.execute(
                text('ALTER TABLE title ADD COLUMN IF NOT EXISTS overview TEXT')
            )
            connection.execute(
                text('ALTER TABLE title ADD COLUMN IF NOT EXISTS runtime_minutes INTEGER')
            )
            connection.execute(
                text(
                    """
                    DO $$
                    DECLARE old_constraint TEXT;
                    BEGIN
                      SELECT conname INTO old_constraint
                      FROM pg_constraint
                      WHERE conrelid = 'title'::regclass
                        AND contype = 'u'
                        AND pg_get_constraintdef(oid) = 'UNIQUE (tmdb_id)'
                      LIMIT 1;
                      IF old_constraint IS NOT NULL THEN
                        EXECUTE format('ALTER TABLE title DROP CONSTRAINT %I', old_constraint);
                      END IF;
                    END $$
                    """
                )
            )
            connection.execute(
                text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS uq_title_tmdb_type "
                    "ON title (tmdb_id, type) WHERE tmdb_id IS NOT NULL"
                )
            )
            connection.execute(
                text(
                    'CREATE UNIQUE INDEX IF NOT EXISTS ix_user_username_ci '
                    'ON "user" (lower(username)) WHERE username IS NOT NULL'
                )
            )
            connection.execute(
                text(
                    """
                    DO $$
                    BEGIN
                      IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'comparison' AND column_name = 'title_a_id'
                      ) THEN
                        ALTER TABLE comparison RENAME COLUMN title_a_id TO new_title_id;
                        ALTER TABLE comparison RENAME COLUMN title_b_id TO other_title_id;
                        ALTER TABLE comparison RENAME COLUMN winner_title_id TO preferred_title_id;
                      END IF;
                    END $$
                    """
                )
            )
            connection.execute(
                text(
                    """
                    ALTER TABLE score
                    ADD COLUMN IF NOT EXISTS rank_position INTEGER,
                    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    """
                )
            )
            connection.execute(
                text(
                    """
                    WITH ordered AS (
                      SELECT id, ROW_NUMBER() OVER (
                        PARTITION BY user_id ORDER BY score DESC, id
                      ) AS position
                      FROM score
                      WHERE rank_position IS NULL
                    )
                    UPDATE score
                    SET rank_position = ordered.position
                    FROM ordered
                    WHERE score.id = ordered.id
                    """
                )
            )
            connection.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS ix_score_rank_position "
                    "ON score (user_id, rank_position)"
                )
            )
            connection.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS ix_comparison_new_title_id "
                    "ON comparison (new_title_id)"
                )
            )
            connection.execute(
                text("ALTER TABLE score ALTER COLUMN rank_position SET NOT NULL")
            )
