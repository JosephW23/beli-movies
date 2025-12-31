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