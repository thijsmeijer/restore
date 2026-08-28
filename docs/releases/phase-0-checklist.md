# Phase 0 exit checklist

## Product and scope

- [x] Canonical roadmap is stored in the repository.
- [x] First-release capabilities and explicit deferrals are normalized.
- [x] Roadmap priority/phase conflicts are resolved in an authoritative record.
- [ ] Owner changes the first-release scope status to `Approved`.

## Safety and content

- [x] Safety results, red flags, stop behavior, and copy boundaries are defined.
- [x] Clinical review is recorded as a gate before daily use.
- [x] Body-region taxonomy and stable identifiers are defined.
- [x] Exercise, contraindication, dosage, relation, media, and review contracts
  are defined.
- [x] Generator invariants are individually testable statements.

## Data and architecture

- [x] P0 entities, field semantics, relationships, and immutability rules are
  defined.
- [x] Import/export/delete and migration recovery semantics are defined.
- [x] Local-first, database, routing, state, and distribution ADRs exist.
- [x] No backend is required for P0.
- [x] Display name is Restore; permanent bundle ID is explicitly deferred to the
  Phase 1 identity gate.

## Delivery governance

- [x] Repository-wide `AGENTS.md` defines boundaries and definition of done.
- [x] Phase 1 bootstrap outcome, exclusions, command contract, and exit evidence
  are documented.
- [x] Documentation links and stable identifiers pass repository checks.
- [ ] Phase 0 documentation has owner approval.

Phase 0 is complete when the two owner-approval boxes are checked. Qualified
clinical review is tracked separately as a prerequisite for a daily-use build.
