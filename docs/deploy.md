# Backend Packaging and Deployment

WATCHD's FastAPI backend can run locally or in a Docker container. The image
contains application code and Python dependencies only. Runtime configuration
and secrets are supplied separately.

## Required environment variables

Create `backend/.env` from `backend/.env.example` and provide values for:

- `DATABASE_URL` — PostgreSQL connection URL for the Supabase database.
- `SUPABASE_JWKS_URL` — Supabase Auth JWKS endpoint.
- `SUPABASE_ISSUER` — expected Supabase JWT issuer.
- `SUPABASE_AUDIENCE` — expected JWT audience, normally `authenticated`.
- `TMDB_READ_ACCESS_TOKEN` — TMDb API read-access token.
- `TMDB_API_KEY` — optional alternative if a read-access token is not used.

Never place real values in the Dockerfile or commit `backend/.env`. The file is
excluded by both Git and Docker.

### Supabase connectivity from Docker Desktop

Some Supabase direct database hosts (`db.<project-ref>.supabase.co`) resolve only
to IPv6. If Docker Desktop reports `Network is unreachable` for that address,
use the IPv4-compatible **Session Pooler** connection string shown under the
Supabase project's **Connect** panel as `DATABASE_URL`. Keep that value only in
the ignored `.env` file or the deployment platform's secret settings.

## Build the image

Install and start Docker Desktop, then run from the repository root:

```bash
cd backend
docker build -t watchd-backend .
```

## Run the container

Pass the local environment file at runtime:

```bash
docker run --name watchd-backend \
  --env-file .env \
  -p 8000:8000 \
  watchd-backend
```

FastAPI is then available at `http://localhost:8000`. In another terminal,
verify both the health route and a database-backed endpoint:

```bash
curl http://localhost:8000/health
curl "http://localhost:8000/titles?limit=2&offset=0"
```

The first response should contain `{"status":"ok"}` and the second should
return a paginated title response.

For a database-independent container smoke test, you can temporarily override
only the database URL with an isolated SQLite file:

```bash
docker run --name watchd-backend-smoke \
  --env-file .env \
  -e DATABASE_URL=sqlite:////tmp/watchd.db \
  -p 8002:8000 \
  watchd-backend
```

Then check `http://localhost:8002/health` and
`http://localhost:8002/titles?limit=2&offset=0`. This confirms container and
database-backed API behavior; use PostgreSQL/Supabase for normal application
operation.

## Stop and restart

When the container is running in the foreground, press `Ctrl+C`. You can also
manage it by name from another terminal:

```bash
docker stop watchd-backend
docker start watchd-backend
docker logs watchd-backend
```

Remove the stopped container before creating a new one with the same name:

```bash
docker rm watchd-backend
```

Rebuild the image after dependency or backend-code changes.

## Continuous integration

`.github/workflows/ci.yml` runs on every push and pull request. GitHub Actions
checks out the repository, installs Python 3.12 and `backend/requirements.txt`,
then runs `pytest` from `backend/`.

The tests provide their own safe configuration, in-memory database, mocked
authentication, and fixed TMDb responses. The workflow therefore needs no
production database password, JWT, Supabase secret, or TMDb token.

After pushing a commit, open the repository's **Actions** tab and confirm the
latest **Backend CI** run is green before merging.
