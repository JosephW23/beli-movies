API Documentation
Health
GET /health

Returns API health status.

Response:

{ "status": "ok" }

GET /db-health

Returns database connectivity status.

Response:

{ "db": "ok" }

Titles
GET /titles

List and search titles.

Query params:

query (optional): search by title name

type (optional): "movie" or "tv"

page (optional, default=1)

page_size (optional, default=20)

Response:

{
  "items": [
    {
      "id": 1,
      "name": "Spirited Away",
      "type": "movie",
      "year": 2001,
      "poster_url": "...",
      "genres": "animation,fantasy",
      "tmdb_id": 1001
    }
  ],
  "page": 1,
  "page_size": 20,
  "total": 20
}

GET /titles/{id}

Get a single title by ID.

Response:

{
  "id": 1,
  "name": "Spirited Away",
  "type": "movie",
  "year": 2001,
  "poster_url": "...",
  "genres": "animation,fantasy",
  "tmdb_id": 1001
}

GET /titles/{id}/rating-summary

Return the public WATCHD average for a title before the user submits their own
ranking. Scores are rounded to one decimal place.

Response:

{
  "average_score": 8.7,
  "rating_count": 24
}

When nobody has ranked the title, `average_score` is `null` and `rating_count`
is `0`.

Events
POST /events

Create or update the authenticated user's current status for a title. The
backend gets the user from the Bearer token; clients must not send `user_id`.

Headers:

Authorization: Bearer <supabase-access-token>

Request:

{
  "title_id": 4,
  "status": "WATCHED"
}

Allowed status values:

- `WANT`
- `WATCHED`
- `WATCHING`

Response (`201 Created`):

{
  "id": 12,
  "title_id": 4,
  "status": "WATCHED",
  "created_at": "2026-08-10T03:00:00Z"
}

Saving a new status for the same user and title updates the existing event.

Errors:

- `401` when the Bearer token is missing, invalid, or expired
- `404` when `title_id` does not exist
- `422` when the request or status is invalid

My List
GET /me/list

Return the authenticated user's Want to Watch and Watched titles, newest
first. `WATCHING` is stored by the events API but does not have a separate
list in the Day 5 response.

Headers:

Authorization: Bearer <supabase-access-token>

Response:

{
  "want_to_watch": [
    {
      "id": 9,
      "name": "Dune",
      "type": "movie",
      "year": 2021,
      "poster_url": "...",
      "genres": "sci-fi,adventure",
      "tmdb_id": 1009,
      "event_id": 11,
      "status": "WANT",
      "saved_at": "2026-08-10T02:55:00Z"
    }
  ],
  "watched": []
}

My Rankings
GET /me/rankings

Return the authenticated user's stored personal rankings, ordered by score from
highest to lowest. The current user comes from the Supabase Bearer token; the
client never sends a user ID.

Query parameters:

- `limit` — optional result limit from 1–100; defaults to 20
- `type` — optional `movie` or `tv` filter

Example requests:

GET /me/rankings?limit=10

GET /me/rankings?limit=20&type=movie

GET /me/rankings?limit=20&type=tv

Response:

[
  {
    "rank": 1,
    "title_id": 4,
    "title_name": "Interstellar",
    "type": "movie",
    "score": 9.6,
    "poster_url": "...",
    "year": 2014
  }
]

The result is `[]` when the user has no rankings. Filtered results receive
sequential display ranks, so the highest-scored matching title is `#1`.

Friends
POST /friends

Add another WATCHD user as a mutual friend by public username. The current user
comes from the Bearer token and is never accepted from the request body. The
value may be entered as `alexsmith`, `@alexsmith`, or `Alex Smith`; all three
normalize to the same username.

At signup, the required Full Name generates the base username: `Joseph
Whiteman` becomes `josephwhiteman`. If it is already taken, WATCHD appends a
number such as `josephwhiteman2`.

Headers:

Authorization: Bearer <supabase-access-token>

Request:

{
  "username": "alexsmith"
}

Response (`201 Created`):

{
  "id": 8,
  "username": "alexsmith",
  "full_name": "Alex Smith"
}

Errors:

- `400` when a user tries to add themselves
- `401` when the Bearer token is missing, invalid, or expired
- `404` when no WATCHD user has that username
- `409` when the friendship already exists
- `422` when the request body is invalid

GET /friends

Return the authenticated user's friends.

Headers:

Authorization: Bearer <supabase-access-token>

Response:

[
  {
    "id": 8,
    "username": "alexsmith",
    "full_name": "Alex Smith"
  }
]

Activity Feed
GET /feed

Return recent title activity from the authenticated user and their friends,
newest first. Each `POST /events` write creates a corresponding activity.

Headers:

Authorization: Bearer <supabase-access-token>

Response:

[
  {
    "id": 31,
    "user": {
      "id": 8,
      "username": "alexsmith",
      "full_name": "Alex Smith"
    },
    "title": {
      "id": 4,
      "name": "Interstellar",
      "type": "movie",
      "year": 2014,
      "poster_url": "..."
    },
    "status": "WATCHED",
    "created_at": "2026-08-10T04:30:00Z"
  }
]

Pairwise Ranking
GET /compare/candidate

Return the next pairwise comparison for a newly watched title. Authentication is
required. `title_id` identifies the watched title being placed.

Query parameters:

- `title_id` (required)
- `exclude_title_ids` (optional comma-separated IDs used by Skip/Too Tough)

Example:

GET /compare/candidate?title_id=9

Response while ranking:

{
  "complete": false,
  "new_title": {
    "id": 9,
    "name": "Dune: Part Two",
    "type": "movie",
    "year": 2024,
    "poster_url": "..."
  },
  "comparison_title": {
    "id": 4,
    "name": "Oppenheimer",
    "type": "movie",
    "year": 2023,
    "poster_url": "..."
  },
  "comparison_number": 1,
  "estimated_comparisons": 3,
  "rank_position": null,
  "score": null,
  "total_ranked": 5
}

If the title is the user's first ranked title, or its exact position is known,
`complete` is `true`, `comparison_title` is `null`, and `rank_position` and
`score` contain the final result.

POST /compare

Record which of the two displayed titles the user prefers. Authentication is
required.

Request:

{
  "title_id": 9,
  "comparison_title_id": 4,
  "preferred_title_id": 9
}

The response uses the same shape as `GET /compare/candidate`: either the next
comparison or the completed personal ranking.

Validation errors:

- `404` when the new title does not exist
- `409` when the new title is not currently marked watched
- `422` when the titles are the same, the comparison is invalid for the current
  range, or `preferred_title_id` is not one of the displayed titles
