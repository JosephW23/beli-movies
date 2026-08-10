# WATCHD Design System

WATCHD is a minimalist black-and-white iOS-style social app for movies, shows,
anime, and anything else people watch. Its visual character should feel clean,
sleek, social, and premium, with the simplicity of Beli.

## Core colors

- Background: `#FFFFFF`
- Surface: `#FFFFFF`
- Subtle control background: `#F5F5F5`
- Primary text: `#111111`
- Secondary text: `#8A8A8A`
- Border: `#E5E5E5`
- Error: `#B54747`
- Primary button: `#111111` with `#FFFFFF` text

Shared frontend values live in `frontend/src/theme.ts`.

## Typography

- Reserve a chunky, rounded, heavy display face for the `WATCHD` wordmark.
- On iOS, use `Arial Rounded MT Bold` for the wordmark until a custom brand
  font is added.
- Use the React Native system sans-serif for every page title, label, control,
  and body line.
- Page titles are bold and compact, not decorative or oversized.
- Secondary copy is small, neutral, and muted.

## Scale and shape

- Prefer compact layouts that show several useful items on one screen.
- Use 8px control corners, 10px card corners, and roughly 6px poster corners.
- Inputs are approximately 40px tall; primary actions are approximately
  40–44px tall.
- Borders are thin and neutral gray.
- Posters stay rectangular and visually prominent.
- Bottom navigation uses a small outline icon with a small label. Active is
  near-black; inactive is muted gray.

## Avoid

- Oversized marketing-style hero cards inside the main app
- Decorative fonts outside the WATCHD wordmark
- Bright accent colors
- Gradients and heavy shadows
- Excessive whitespace or oversized controls
- Extremely pill-shaped cards and buttons
- Star ratings

## Ratings

WATCHD ratings use a numeric `1–10` scale. Never use stars. Ratings and
reviews are intentionally outside the Day 5 event-status scope and will be
added in a later feature.
