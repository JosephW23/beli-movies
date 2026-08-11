# Architecture

## High-Level Overview

- React Native + Expo (TypeScript) mobile app
- FastAPI backend (Python)
- Supabase for:
  - Auth (JWT)
  - Hosted Postgres (database)

Mobile app → FastAPI → Supabase Postgres

Mobile app → FastAPI → TMDb movie/TV catalog

Mobile app → Supabase Auth → JWT → FastAPI

## Navigation Responsibilities

- Home: personalized recommendations, friend-only activity, and live TMDb trends
- Search: discover titles and open the shared detail/status/ranking flow
- Profile: identity, Want to Watch and Watched lists, rankings, friends, and account

The root auth gate owns the logged-in decision. Logged-out users see the Auth
stack; logged-in users see Home, Search, and Profile. Home owns a nested full
recommendations screen. Search owns the shared title-detail and comparison
stack, while Profile owns the user's saved lists and friend management.

## Code Responsibilities

Backend requests follow `router → service → model/database`. Routers validate
HTTP input and format responses; domain services own database queries and
business rules. JWT validation and current-user resolution stay in `core/auth`.

Frontend screens arrange page sections and request data through typed functions
in `src/api`. The shared API client owns base URL, authorization headers, JSON
handling, and errors. Components such as `ActivityCard`, `FriendsSection`, and
`TitleRowList` receive data through props and do not fetch their own data.

## Core Tables

- `user`: maps a verified Supabase JWT subject to an internal ID and public username
- `title`: catalog entries for movies, TV, anime, and other watchable media
- `event`: a user's current WANT, WATCHED, or WATCHING status for a title
- `friendship`: one mutual connection between two WATCHD users
- `activity`: extensible feed-ready user actions with title-status metadata
- `review`: one editable written review per user and watched title

## TMDb Catalog Flow

Search and Add call FastAPI's `/search` endpoints. `tmdb_service.py` owns the
external HTTP calls and normalizes movie and TV responses; no TMDb credential
is shipped in the Expo app. A result stays external until the user saves a
status. `POST /titles/import` then fetches its details and reuses or creates the
local row by the composite `(tmdb_id, type)` identity before `/events` records
the user's action.

## Day 10 Recommendation Flow

Home calls authenticated `GET /me/recs`. The recommendations router delegates
to `recs_service.py`, which combines personal Score rows, source-title genres,
all current Event exclusions, a secondary friendship signal, and normalized
TMDb Discover candidates. The service returns external titles with short
reasons; it never imports recommendations merely because Home displayed them.

The endpoint shape stays stable while the recommendation strategy can later be
replaced with collaborative filtering, embeddings, or a learned model. Home's
For You, Following, and Trending tabs load recommendations, social data, and
TMDb trends independently so one unavailable source does not take down the
others. The For You arrow opens a scrollable expanded recommendation screen.

## Day 5 Event Flow

Authenticated Expo app → `POST /events` with Bearer JWT → FastAPI verifies JWT
→ event service creates or updates the user's title status → Supabase Postgres

Authenticated Expo app → `GET /me/list` → event service groups the user's
saved titles → Add renders Want to Watch and Watched views while Home uses
the saved data to personalize recommendations and activity

## Day 6 Social Flow

Authenticated Expo app → `POST /friends` → social service validates the username,
prevents self/duplicate connections, and creates one mutual friendship row.

Authenticated title action → event service writes `Event` + `Activity` in the
same transaction → `GET /feed` loads newest activity for the current user and
both sides of their friendship connections → Home renders `ActivityCard` rows.

The social router owns HTTP validation and responses; `social_service.py` owns
friend and feed queries; Home only displays feed data; Profile manages friends.

## Day 8 Ranking Flow

Mark Watched → comparison router → ranking service → comparison history and
personal score tables. The Search stack owns the shared title-detail and
`CompareScreen` flow. The frontend sends only which displayed
title was preferred, while candidate selection and binary rank insertion remain
private backend behavior.
