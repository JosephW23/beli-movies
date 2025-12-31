# Movie Taste App (Beli x Letterboxd)

A mobile app that lets you compare movies/TV shows, rank your personal taste with pairwise comparisons, and see what your friends are watching and loving.

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