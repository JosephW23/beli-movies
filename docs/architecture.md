# Architecture

## High-Level Overview

- React Native + Expo (TypeScript) mobile app
- FastAPI backend (Python)
- Supabase for:
  - Auth (JWT)
  - Hosted Postgres (database)

Mobile app → FastAPI → Supabase Postgres  
Mobile app → Supabase Auth → JWT → FastAPI

## Navigation Responsibilities

- Home: personalized recommendations and recent WATCHD activity
- Add: find or select a title, log it, and view Want to Watch and Watched lists
- Search: discover titles through search, media filters, genres, and curated rows
- Profile: identity, stats, taste, top titles, reviews, lists, activity, and account

## Core Tables

- `user`: maps a verified Supabase JWT subject to WATCHD's internal user ID
- `title`: catalog entries for movies, TV, anime, and other watchable media
- `event`: a user's current WANT, WATCHED, or WATCHING status for a title
- `activity`: feed-ready user actions such as title events and comparisons

## Day 5 Event Flow

Authenticated Expo app → `POST /events` with Bearer JWT → FastAPI verifies JWT
→ event service creates or updates the user's title status → Supabase Postgres

Authenticated Expo app → `GET /me/list` → event service groups the user's
saved titles → Add renders Want to Watch and Watched views while Home uses
the saved data to personalize recommendations and activity
