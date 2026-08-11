# TMDb Integration

WATCHD uses TMDb as its external movie and TV catalog. The Expo app calls the
FastAPI backend; only FastAPI calls TMDb. This keeps the credential out of the
mobile bundle and gives WATCHD one place to normalize provider data.

## Configuration

Add one credential to `backend/.env`:

```env
TMDB_READ_ACCESS_TOKEN=your-tmdb-read-access-token
```

`TMDB_API_KEY` is also supported as an optional alternative. Real values belong
only in `.env`, which is ignored by Git. Commit `backend/.env.example`, never
`backend/.env`.

## Search and details

- `GET /search?q=dune` searches TMDb movies and TV shows, filters out people,
  and returns one normalized result shape.
- `GET /search/trending` supplies Home recommendations from the live TMDb
  weekly catalog rather than the original local seed list.
- `GET /search/movie/{tmdb_id}` and `GET /search/tv/{tmdb_id}` return normalized
  details including overview, genres, runtime when available, and any existing
  WATCHD rating average.
- Poster paths become `w500` TMDb image URLs in the backend.
- Empty frontend searches do not make a network request.

The existing `GET /titles` endpoint remains the local WATCHD catalog.

## Saving titles

Search results remain external until an authenticated user chooses a list
action. The frontend then calls `POST /titles/import` with `tmdb_id` and media
type. FastAPI fetches trusted details from TMDb and either creates the local
title or reuses the existing `(tmdb_id, type)` row. The normal `POST /events`
flow then records Watched, Want to Watch, or Currently Watching.

WATCHD stores the title name, media type, year, poster URL, genres, overview,
runtime, and TMDb ID. It does not copy the full TMDb catalog.

## Attribution

This product uses the TMDB API but is not endorsed or certified by TMDB.

TMDb attribution guidance and approved logos are available from the
[TMDb logos and attribution page](https://www.themoviedb.org/about/logos-attribution).
