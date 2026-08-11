# Performance and Stability

WATCHD uses targeted MVP optimizations for the queries and lists that run most
often. These changes improve predictable behavior as user data grows; they are
not a claim of internet-scale capacity.

## Database indexes

The SQLModel table definitions and the idempotent PostgreSQL startup migration
both define these compound indexes:

- `ix_event_user_title` on `event(user_id, title_id)` for status and My List lookups.
- `ix_score_user_title` on `score(user_id, title_id)` for personal score lookups.
- `ix_friendship_user_friend` on `friendship(user_id, friend_id)` for social graph lookups.
- `ix_activity_user_created_at` on `activity(user_id, created_at)` for newest-first feeds.

`init_db()` uses `CREATE INDEX IF NOT EXISTS` so databases created before Day 11
receive the indexes when the backend starts. New databases receive them from
SQLModel metadata during `create_all()`.

## Pagination

The local API uses validated `limit` and `offset` values:

- `GET /titles?limit=20&offset=0` defaults to 20 and allows at most 50 rows.
  Its response includes `total` and `has_more`.
- `GET /feed?limit=20&offset=0` defaults to 20 and allows at most 50 rows.
  It sorts by `created_at DESC, id DESC` before applying pagination so page order
  remains deterministic.

Negative offsets, non-positive limits, and limits above 50 are rejected by
FastAPI validation. `/me/rankings` applies its limit in SQL, and `/me/recs`
keeps both its source-title query and TMDb candidate pages bounded.

## Query loading

- Feed rows load activity, actor, title, and optional score in one joined query.
- My List loads events, titles, and optional scores in one joined query.
- Rankings load scores and titles in one joined, limited query.
- Friends are resolved with one friendship query and one batched `IN` user query.

These paths avoid the common pattern of issuing one extra title or user query
for every displayed row.

## Mobile behavior

Home requests feed pages in groups of 20 and appends unique activity IDs near
the end of the list. An in-flight guard prevents duplicate page requests. A
short final page disables additional loading. Page-two failures preserve page
one and show a retry message.

Pull-to-refresh resets Home to the first feed, recommendation, and trending
pages. Existing content remains visible if a refresh fails. Profile also
supports pull-to-refresh for identity, lists, friends, reviews, and rankings.

