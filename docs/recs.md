# Recommendations

WATCHD's Day 10 recommendation system answers one question: which unseen TMDb
titles best match this user's established taste? It remains separate from the
ranking system, which answers how the user orders titles they have watched.

## Signals and ordering

`recs_service.py` starts with up to five of the user's strongest rankings. A
title scoring at least 7.0 is influential, and a higher personal score gives its
genres more weight. The service loads the trusted TMDb genre IDs for those
titles and asks TMDb Discover for popular movies or shows in the strongest
genres.

Candidates receive an internal relevance value based on:

1. overlap with each highly ranked source title;
2. the source title's personal score;
3. total weighted genre overlap;
4. a smaller boost for friends who watched or highly ranked the candidate;
5. a small popularity and poster-quality tiebreaker.

This relevance value only orders recommendations. It is not a user's WATCHD
1–10 score and is not returned by the API.

## Exclusions

WATCHD excludes every title the current user has already interacted with:

- Watched
- Want to Watch
- Currently Watching

The ranked source titles are therefore also excluded. Recommendations stay
external and are not inserted into the local `title` table merely because they
were displayed.

## Reasons

The strongest matching ranked title produces a short explanation such as
`Because you liked Interstellar`. Genre fallback reasons use wording such as
`Because you like science fiction`. A friend-only match can say
`Popular among friends`. New users receive unseen TMDb trending titles labeled
`Popular on TMDb`.

## Interaction flow

Home calls authenticated `GET /me/recs?limit=20`. Tapping the For You arrow
opens a scrollable expanded list, and tapping any recommendation opens the
shared Search title-detail stack. The Following tab filters the authenticated
feed to friends and links an empty account to friend management. The Trending
tab displays the current normalized TMDb weekly trend results. Choosing Watched,
Want to Watch, or Currently Watching reuses the existing TMDb import and event
flow. Pulling to refresh Home updates all three sources.

Both recommendation and TMDb trending requests accept a `page` parameter. The
Home carousels and expanded For You grid request the next page near the end of
the current scroll, append unseen IDs, and continue until TMDb returns no more
results.

Recommendation failures are isolated from the activity feed, so Home can still
display social activity while TMDb is unavailable.

## Privacy boundary

FastAPI sends TMDb only catalog requests such as title IDs and genre filters.
It does not send a WATCHD user ID, username, JWT, personal score, friendship,
or list status to TMDb. Personal weighting and exclusions happen inside the
WATCHD backend after TMDb returns catalog candidates.
