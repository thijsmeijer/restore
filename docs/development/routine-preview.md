# ROUTINE-001 routine preview contract

## Context and stories

This milestone implements the recommended-sequence `ROUTINE-001` ticket and
the preview-facing parts of `GEN-006`, `GEN-007`, `GEN-008`, and `GEN-010`.
It follows the normalized first-release routine-review scope, the Phase 7
preview/editor requirements, ADRs 0002–0004, and the routine safety invariants.

## Outcome and allowed files

The ticket may add the routine application boundary, pure editing behavior,
versioned SQLite routine storage, a focused preview route, the Today
recommendation state, tests, and this contract. Generator refactors are allowed
only where they share existing selection and validation rules with replacement.

The resulting flow must:

- persist every successful routine with its complete input, content, rule,
  engine, seed, explanation, prescription, and validation snapshots;
- show phases, exact dosage, concise selection reasons, total duration, and
  stop guidance before the player exists;
- replace only through a reviewed, eligible relation that passes the same hard
  filters and final validation as generation;
- regenerate to a new immutable routine while preserving and superseding the
  prior result; and
- expose explicit, actionable failures without turning a blocked or unreviewed
  result into a routine.

## Persistence and historical integrity

Schema version 8 adds new routine tables only, so the migration does not rewrite
or delete existing owner records and does not require the owner-data backup gate.
Every released schema fixture must still migrate through version 8 and
interrupted migration rollback remains covered by the common migration suite.

Ready routines and their items are immutable. Replacement and regeneration
create a new ready routine linked to the prior routine and mark only the prior
status as `superseded` in the same transaction. A failed edit leaves the prior
routine ready and unchanged. The future lossless export/import format must
include both tables and their referenced historical content; this additive
schema does not alter the current, not-yet-implemented export format.

## Safety, privacy, and accessibility

- Every generation, replacement, and regeneration entry point performs hard
  filtering before scoring and final routine validation before persistence.
- `blocked` input cannot generate, regenerate, or replace.
- Draft, merely engineering-reviewed, retired, missing, or version-mismatched
  content cannot become selectable.
- The preview keeps stop guidance visible and uses product-boundary language;
  it does not diagnose or promise safety.
- Owner notes and health-adjacent ratings are not repeated in preview copy or
  error details.
- Controls have names, roles, hints, large targets, Dynamic Type-compatible
  layout, non-color-only state, and no gesture or motion dependency.

## Tests and commands

Automated coverage must include exact persistence/hydration, immutable ready
records, atomic supersession, replacement eligibility and validation, failed
edit rollback, blocked/unreviewed failure states, reason/dosage rendering,
route identity handling, and Today navigation.

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm content:validate
pnpm generator:scenarios
pnpm verify
```

The Today and preview states must also be exercised on the physical iPhone.

## Explicit non-goals and current limitation

This ticket does not implement the player, session logs, reorder, remove, lock,
save/schedule, feedback learning, content activation, export/import, or a
backend. Those remaining P0 editor actions require a separate narrow milestone.

The bundled `0.1.0` catalog is deliberately draft-only and contains no reviewed
routine templates. Production generation therefore remains fail-closed with a
clear content-review-pending state. Successful preview and edit behavior is
covered only by isolated clinically reviewed test fixtures until qualified
review approves exact content and template versions. This ticket must not
fabricate or activate that approval.
