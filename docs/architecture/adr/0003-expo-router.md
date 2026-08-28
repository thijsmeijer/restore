# ADR 0003: Expo Router for navigation and deep links

- **Status:** Accepted
- **Date:** 2026-08-28

## Context

Restore needs tab navigation, full-screen flows, notification deep links, and a
future path to widgets/App Intents without mixing navigation with domain logic.

## Decision

Use Expo Router with route files kept thin. The `app/` tree defines layouts,
route parameters, and screen composition. Feature behavior belongs under
`src/features`, while domain rules and generation remain platform independent.

Deep links use a versioned intent payload and stable entity IDs. A deep link may
request opening or starting a routine, but stale or external input is validated
before use and never bypasses onboarding, safety, or routine validation.

The initial navigation shape is five tabs—Today, Library, Progress, Plan, and
Settings—with check-in, routine preview, and session player as focused routes.

## Consequences

- Route parameters receive runtime validation.
- Notification/deep-link integration tests cover missing, stale, and malformed
  targets.
- The session player may replace tab chrome without owning navigation rules.

## Alternatives rejected

- **Ad-hoc screen state:** poor deep-link and recovery behavior.
- **Navigation logic embedded in domain services:** introduces platform coupling.
- **A second routing abstraction:** unnecessary until a demonstrated limitation.
