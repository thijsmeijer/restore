# ADR 0004: Explicit state ownership

- **Status:** Accepted
- **Date:** 2026-08-28

## Context

Restore contains durable facts, transient forms, active session checkpoints,
small secrets, media, and build artifacts. Ambiguous ownership risks data loss
and inconsistent recommendations.

## Decision

- **SQLite:** profile, check-ins, safety results, content, routines, sessions,
  outcomes, preferences, plans, notifications, and derived caches.
- **Zustand:** unsaved form drafts, transient UI state, active player presentation
  state, and debug overlays. Active session checkpoints are persisted to SQLite.
- **SecureStore:** encryption keys, optional future API tokens, and local lock
  preference—not general domain data.
- **Files:** bundled/local exercise media, exports, backups, and future assessment
  media, referenced by durable metadata.
- **EAS:** binaries and compatible JS/assets only; never personal domain data.

Application services coordinate repositories and platform adapters. UI uses
services/hooks and never issues raw SQL. Store hydration must not cause a second
source of truth.

## Consequences

- Backgrounding/restart tests verify active session recovery from durable state.
- Delete-all enumerates every owner and cancels pending notifications.
- Feature tests use repository and platform fakes.
- Moving an entity between owners requires an ADR/data migration, not convenience.

## Alternatives rejected

- **Persist all Zustand state:** weak query/migration/history guarantees.
- **SQLite for every UI interaction:** unnecessary coupling for ephemeral state.
- **SecureStore for health-adjacent facts:** unsuitable for relational datasets.
