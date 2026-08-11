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

- Home: personalized recommendations and the authenticated social activity feed
- Add: find or select a title, log it, and view Want to Watch and Watched lists
- Search: discover titles through search, media filters, genres, and curated rows
- Profile: identity, stats, taste, top titles, friend management, and account

The root auth gate owns the logged-in decision. Logged-out users see the Auth
stack; logged-in users see the four main tabs. Add owns a nested stack so title
selection and status updates do not become additional bottom tabs.

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
personal score tables. The Add stack owns `CompareScreen`; the discovery Search
tab and social feed remain separate. The frontend sends only which displayed
title was preferred, while candidate selection and binary rank insertion remain
private backend behavior.
