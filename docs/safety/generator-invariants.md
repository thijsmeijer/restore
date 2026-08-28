# Routine-generator invariants

These statements define the non-negotiable behavior of the pure routine engine.
Each numbered invariant must map to automated tests before its implementation is
considered complete.

## Interface

The engine accepts an immutable, validated `GenerationInput` and returns either
a validated `GeneratedRoutine` or an explicit `GenerationFailure`. It has no
React Native, database, clock, network, file, notification, or global-state
dependency. Time, configuration, content, history, and the random seed are
inputs.

```text
generate(input, catalog, rules) -> GeneratedRoutine | GenerationFailure
```

The input contains the check-in and safety result, target regions, intent,
training context, available minutes, equipment/environment, profile goals,
preferences, response aggregates, recent exposure, versions, and seed.

The output contains the input snapshot, timestamps supplied by the caller,
content/rules/engine versions, seed, target priorities, ordered phases, exact
prescriptions, explanations, alternatives, duration estimate, and validation
report.

## Hard invariants

1. `blocked` input never returns a routine.
2. `gentle_only` input returns only clinically approved gentle content within
   the gentle template’s intensity and dosage ceilings.
3. An exercise with a matching hard contraindication is never selected.
4. Missing equipment, unstable equipment, insufficient space, incompatible
   environment, side, or session mode always excludes the exercise.
5. A user-avoided exercise is never selected until explicitly restored.
6. Disabled, incomplete, unreviewed, or invalid content is never selected in a
   daily-use build.
7. Recommendation score, favorites, response history, novelty, and manual edits
   can never override invariants 1–6.
8. Every prescription remains within the exercise version’s dosage, set,
   progression, side, and intensity limits.
9. Every routine follows a valid phase template for its mode and duration.
10. Duplicate exercise IDs are forbidden; repeated movement patterns stay
    within configured limits.
11. Every high-priority target is addressed or the validation report provides a
    reason it could not be addressed.
12. The estimated duration is within ±10% of requested time or differs by at
    most one indivisible short exercise; otherwise generation returns an
    explicit failure/fallback result.
13. A non-empty, valid safe fallback is returned when reviewed fallback content
    exists. The engine never returns an unexplained empty routine.
14. The same validated inputs, content, rules, engine version, and seed produce
    byte-equivalent ordered prescriptions and reason codes.
15. A stored routine references exact exercise versions; newer content cannot
    change its historical prescription or explanation.
16. Replacement, regeneration, reorder, removal, resume, and duration edits run
    the same final validation as initial generation.

## Processing order

The engine uses this fixed pipeline:

1. Validate input and versions.
2. Enforce the check-in safety result.
3. Compute the bounded target-priority vector from configuration.
4. Apply all hard candidate filters.
5. Score remaining candidates with an inspectable breakdown.
6. Allocate duration to required and optional phases.
7. Select and sequence candidates.
8. Apply exact dosage without exceeding content limits.
9. Produce stable reason codes and readable explanations.
10. Validate the complete routine against every invariant.
11. Return the routine, a reviewed fallback, or an explicit failure.

No stage may catch a hard-filter failure and downgrade it to a scoring penalty.

## Bounded P0 response ranking

P0 may use immediate historical signals only after hard filtering:

- Favorite: bounded positive term.
- Repeated helpful response: bounded positive term.
- Repeated neutral response: no positive assumption.
- Repeated uncomfortable response: bounded negative term; a permanent avoid is
  a hard filter.
- Skip or replacement: bounded negative term only when the behavior indicates
  exercise preference rather than missing time/equipment or a safety stop.

All terms live in versioned configuration, have individual and combined caps,
appear in the debug trace, and can be reset. With no history, their value is
zero. Phase 11 may add contextual/delayed models but must preserve these bounds
and the hard-filter ordering.

## Required test families

- Table tests for each hard filter, rule boundary, and reason code.
- Property tests over all regions, sides, modes, 2–90-minute durations,
  equipment combinations, and conflicting/adversarial inputs.
- Golden fixtures for representative check-ins and every supported template.
- Metamorphic tests proving that adding unavailable equipment or an avoided
  exercise cannot make it selectable.
- Determinism tests across repeated runs and stored reproduction fixtures.
- Mutation/edit tests proving every routine editing path revalidates.
- Version-compatibility fixtures for old content and stored routines.
- Failure/fallback tests for empty catalogs, impossible duration, all content
  contraindicated, and zero or every region selected.

Every failure must report stable machine-readable reason codes suitable for the
developer trace and a separate user-facing explanation key.
