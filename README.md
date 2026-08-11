# WATCHD

A social app for movies, shows, anime, and anything else people watch. Users
can save watch statuses, build their taste profile, connect with friends, and
see recent friend activity.

## App Navigation

Home | Add | Search | Profile

- **Home** — recommendations and activity from you and your friends
- **Add** — find a title and mark Want to Watch, Watched, or Watching
- **Search** — discover movies, shows, and anime
- **Profile** — taste, stats, top titles, and username-based friend management

## Stack

- React Native + Expo (TypeScript)
- FastAPI (Python)
- Supabase (Auth + Postgres)
- PostgreSQL
- Docker + AWS Elastic Beanstalk
- pytest + GitHub Actions

## Project Structure

- `frontend/src/navigation/` — auth gate, main tabs, and nested Add stack
- `frontend/src/screens/` — screen-level layout and data orchestration
- `frontend/src/components/` — reusable presentational UI
- `frontend/src/api/` — typed backend client functions
- `frontend/src/types/` — shared TypeScript models
- `backend/app/api/` — thin FastAPI routers
- `backend/app/services/` — title, event, and social business logic
- `backend/app/core/` — Supabase JWT verification
- `backend/app/models/` — database models
- `docs/` — architecture, API, auth, and design notes

## How to Run Locally

### Backend

From the repository root:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

Replace the placeholders in `backend/.env` with your Supabase Postgres and Auth
values. The required variables are:

- `DATABASE_URL`
- `SUPABASE_JWKS_URL`
- `SUPABASE_ISSUER`
- `SUPABASE_AUDIENCE` (normally `authenticated`)

The API runs at `http://127.0.0.1:8000`. Check `/health`, then open `/docs`
for the interactive API documentation.

### Frontend

In a second terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm start
```

Set these values in `frontend/.env`:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_API_BASE_URL`

For a physical phone, `EXPO_PUBLIC_API_BASE_URL` must use the computer's LAN IP,
such as `http://192.168.1.20:8000`, rather than `localhost`. With Expo running,
press `i` for the iOS Simulator or `a` for Android. Use the installed development
build when native modules are required.

Never commit either `.env` file. They are ignored by Git; the tracked
`.env.example` files contain placeholders only.

## Screenshots

| Home | Add | Search | Profile |
| --- | --- | --- | --- |
| Coming soon | Coming soon | Coming soon | Coming soon |

## Status

Part 1:
- Repo, folders, and docs initialized
- FastAPI backend running with /health endpoint
- Expo React Native app initialized
- iOS Simulator setup in progress

Part 2:
- Supabase project created
- Supabase Postgres connected to FastAPI via DATABASE_URL
- SQLModel session wired (engine + get_session dependency)
- Core database models created (User, Title, Event, Comparison, Score, Friendship, Activity)
- Tables successfully created in Supabase
- /db-health endpoint added and returns {"db":"ok"}

Part 3:
- Titles API implemented
- Seed data loaded into Supabase
- `/titles` and `/titles/{id}` endpoints working
- Navigation refactored to Home / Add / Search / Profile
- Product model finalized

Day 4:
- Supabase login/signup and JWT-gated navigation
- FastAPI JWT verification and authenticated `/me`

Day 5:
- Protected event creation for WANT, WATCHED, and WATCHING
- Authenticated My List and Add-tab title logging

Day 6:
- Mutual friend creation and friend listing
- Event-backed activity records and authenticated social feed
- Home feed cards and Profile friend management

Day 7:
- Thin backend routers and domain-focused services
- Stable auth gate, main tabs, and nested Add flow
- Shared frontend API client and reusable data types/components
- Loading, error, empty, and action-feedback states
- Local setup and environment documentation

Day 8:
- Pairwise preference ranking for watched titles
- Binary rank insertion and calculated personal 1–10 scores
- Compare screen inside the Add stack
- Stored comparison history and ranking documentation

Day 9:
- Authenticated personal rankings endpoint with limit and media filters
- Score-ordered My Rankings section on Profile
- All, Movies, and TV ranking filters
- Ranking-specific loading, error, and empty states
