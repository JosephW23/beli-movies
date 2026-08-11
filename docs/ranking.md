# Pairwise Ranking

WATCHD builds a personal ordered list from an enjoyment answer followed by
simple pairwise preferences. A user never has to invent a numeric rating. The
flow first asks **Did you enjoy the watch?** and then asks **Which title do you
prefer?** when there are comparable titles in the same rating range.

## How a Title Enters the Ranking

Only titles marked `WATCHED` can be ranked. When a watched title does not have a
personal ranking yet, the backend starts a ranking flow. Want-to-watch and
currently-watching titles are never comparison candidates.

Marking a title watched does not assign a rating by itself. Choosing Yes keeps
the eventual rating from 5.0–10.0; choosing No keeps it from 1.0–4.9. If that
range has no existing titles, WATCHD starts the title at 7.5 for Yes or 3.5 for
No. Otherwise, binary comparisons place it among titles in the same range.

## Candidate Selection and Narrowing

The possible insertion range begins above the highest title and below the last
title in the selected enjoyment range. WATCHD chooses the title near the middle
of that range.

- If the new title is preferred, its possible position moves above the
  comparison title.
- If the existing title is preferred, its possible position moves below it.
- Skip asks for another eligible candidate without saving a preference.
- Too Tough is neutral: the app first skips that matchup and asks about another
  title. If no alternatives remain, WATCHD places the title near the middle of
  the unresolved range without forcing it to equal either title.

Saved comparison history reconstructs the range on every request, so a network
failure does not erase progress. Once the upper and lower bounds meet, the exact
insertion position is known and the ranking is finalized.

## Personal Scores

WATCHD calculates a one-decimal score only for the newly ranked title. It uses
the scores immediately around the new placement, allowing values such as 7.5
or 8.8 as well as equal scores. Existing personal scores are never recalculated
when another title is added. Display rank positions may move as new titles are
inserted, but the stored rating a user already received stays fixed.

If the calculated score does not match how the user feels, the title detail
menu can replace that one score with a manually entered value from 1.0–10.0.
The override reorders display positions but never changes another title's
stored score. Equal scores remain valid when a manual override or score
calculation naturally produces one.

## Reviews

After a comparison finishes, the user can write a review or choose Not now.
The title detail `•••` menu offers the same Write review/Edit review action
later. A user has at most one review per watched title, and saving again edits
that review. Profile displays the real review count and the user's saved review
list.

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
