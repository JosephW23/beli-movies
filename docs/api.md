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
first. `WATCHING` is stored by the events API but does not have a Home section
in the Day 5 response.

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
