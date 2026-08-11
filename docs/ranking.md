# Pairwise Ranking

WATCHD builds a personal ordered list from simple pairwise preferences. A user
never has to invent a numeric rating or interact with winner/loser language.
They only answer: **Which title do you prefer?**

## How a Title Enters the Ranking

Only titles marked `WATCHED` can be ranked. When a watched title does not have a
personal ranking yet, the backend starts a ranking flow. Want-to-watch and
currently-watching titles are never comparison candidates.

The first watched title becomes rank `#1` immediately. With one existing ranked
title, one comparison determines the new order. With larger lists, WATCHD uses
binary insertion to determine the position with only a few comparisons.

## Candidate Selection and Narrowing

The possible insertion range begins above the current `#1` title and below the
last ranked title. WATCHD chooses the title near the middle of that range.

- If the new title is preferred, its possible position moves above the
  comparison title.
- If the existing title is preferred, its possible position moves below it.
- Skip and Too Tough do not save a preference or change the range; the client
  asks for another eligible candidate.

Saved comparison history reconstructs the range on every request, so a network
failure does not erase progress. Once the upper and lower bounds meet, the exact
insertion position is known and the ranking is finalized.

## Personal Scores

Rank position is the source of truth. WATCHD derives the visible 1–10 score from
that position and recalculates scores after insertion. Rank `#1` receives 10.0;
lower positions receive progressively lower values. The calculation keeps every
higher-ranked title above every lower-ranked title.

For smaller lists, the formula leaves room for future titles instead of
stretching a two-title list from 10.0 to 1.0. For larger lists, it scales across
the full 1–10 range. The algorithm is internal and can evolve without changing
the preferred-title API contract.

## Storage

`score` stores one personal ranking per user and title:

- `user_id`
- `title_id`
- `rank_position`
- `score`
- `created_at`
- `updated_at`

`comparison` stores each answered pair:

- `user_id`
- `new_title_id`
- `other_title_id`
- `preferred_title_id`
- `created_at`

All candidate selection, validation, position narrowing, final placement, and
score calculation live in `ranking_service.py`.

## Rankings in Profile

Day 8 creates and updates the stored personal ranking. Day 9 only reads that
data for display; Profile never calculates a second score.

Profile requests `GET /me/rankings?limit=20` with the user's JWT. The backend
filters by the current user and sorts stored scores from highest to lowest, so
the highest score appears as `#1`. Selecting Movies or TV repeats the request
with the corresponding `type` filter. Loading, errors, and an empty ranking are
handled independently from the rest of the Profile screen.
