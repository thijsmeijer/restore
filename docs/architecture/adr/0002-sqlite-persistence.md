# ADR 0002: SQLite persistence and typed repositories

- **Status:** Accepted
- **Date:** 2026-08-28

## Context

Restore stores relational, historical, versioned, and locally queryable facts.
It requires transactions, migrations, export/import, recovery, and offline
operation.

## Decision

Use `expo-sqlite` as the device source of truth, with Drizzle ORM or an
equivalent typed migration layer chosen and pinned in Phase 1/2. Application
features use repository interfaces and transactions rather than raw SQL.

Migrations are forward-only after release. Before a migration that can affect
user data, create and integrity-check a recoverable local backup. Test migration
from every previously released schema fixture and test interrupted recovery.

Content and generated routines retain exact versions. Mutable definitions never
rewrite historical sessions. JSON import validates in temporary storage and
commits atomically.

## Consequences

- UI and Zustand stores may not become shadow databases.
- Repository tests cover constraints, cascades, transactions, interruptions,
  migrations, and historical integrity.
- Schema and content versioning are independent.
- Derived statistics must be rebuildable from source facts.

## Alternatives rejected

- **Async key/value storage as primary storage:** insufficient relational and
  migration guarantees.
- **Remote database:** violates offline and privacy requirements.
- **Unversioned JSON files:** weak transactional and referential integrity for
  evolving historical data.
