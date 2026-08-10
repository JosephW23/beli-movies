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

- `frontend/` — React Native + Expo app
- `backend/` — FastAPI backend
- `docs/` — Architecture, API docs, etc.

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
