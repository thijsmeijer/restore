# Restore repository instructions

These instructions apply to the entire repository. More specific `AGENTS.md`
files may add constraints but may not weaken the product, privacy, accessibility,
data-integrity, or safety rules here.

## Read before changing the repository

1. `docs/product/first-release-scope.md`
2. The relevant section of `docs/product/restore-roadmap.md`
3. Relevant ADRs under `docs/architecture/adr/`
4. `docs/safety/safety-policy.md`
5. `docs/safety/generator-invariants.md` for generation, content, check-in,
   routine editing, or session-player work
6. Relevant content/data contracts

If documents conflict, the normalized first-release scope controls release
priority, safety documents control safe behavior, and accepted ADRs control
architecture. Do not silently choose between unresolved requirements; record the
decision explicitly.

## Product boundary

Restore is an offline-first personal iPhone mobility and body-restoration app.
It supports mobility, breathing, posture-oriented movement, low-load control,
calisthenics preparation/restoration, feedback, and local planning.

It is not a strength-program generator, diagnostic product, injury-rehabilitation
replacement, social service, subscription product, or multi-tenant SaaS. The P0
app has no backend, login, cloud sync, AI, camera analysis, HealthKit, widgets,
Live Activities, or Apple Watch dependency.

## Architecture rules

- SQLite is the durable source of truth; UI and Zustand are not shadow databases.
- UI calls application services/repositories and never raw SQL.
- The routine generator is pure TypeScript with no React Native, database,
  network, file, clock, notification, or global-state dependency.
- Platform integrations sit behind interfaces and have test fakes.
- Content is schema-validated before persistence or generation.
- Historical routines and completed sessions reference exact content/rule/engine
  versions and are not rewritten by later edits.
- AI may eventually produce validated drafts but may never directly activate
  exercise content, write generator output, or bypass safety review.
- Do not introduce a backend until an approved ADR names the concrete feature
  requiring it.

## Safety rules

- Hard safety and compatibility filters always run before scoring and cannot be
  overridden by preference, history, UI edits, or debug tooling.
- Every generation and editing entry point runs final routine validation.
- Never weaken a safety invariant or broaden eligible content to make a test pass.
- No AI-created or custom exercise becomes active without complete metadata,
  validation, engineering review, and the required clinical review.
- Safety language describes product boundaries and observed input; it never
  invents a diagnosis or guarantees safety.
- Daily-use builds require clinical approval for the exact shipped safety rules
  and active exercise versions.

## Data and migration rules

- Released migrations are forward-only.
- Any migration that can affect owner data requires a verified pre-migration
  backup, fixtures from every released schema, interrupted-recovery coverage, and
  an export/import compatibility assessment.
- Data-destructive behavior requires explicit tests and visible user confirmation.
- Preserve missing values distinctly from explicit zero.
- Export/import formats, content, rules, and generator behavior are versioned.
- Diagnostic output excludes notes, health-adjacent values, and media by default.

## Dependency policy

Do not add a dependency without documenting:

- the concrete requirement it satisfies;
- why platform or existing code is insufficient;
- maintenance, privacy, native-build, bundle-size, and licensing impact;
- alternatives considered; and
- removal/replacement implications.

Pin versions according to the project’s package-manager policy. Do not request a
native permission or entitlement before its feature exists.

## Accessibility and UX definition of done

P0 accessibility is part of the feature, not cleanup. Interactive work includes:

- VoiceOver names, roles, values, hints, and focus behavior;
- Dynamic Type and large touch targets;
- light/dark and sufficient contrast;
- Reduce Motion behavior;
- no color-, sound-, haptic-, or gesture-only meaning;
- captions/text alternatives for media and audio; and
- usable controls from floor distance where the session player requires it.

## Naming and formatting

- TypeScript uses strict mode; avoid `any` and unchecked casts.
- Domain names follow the canonical snake-case wire values and clear TypeScript
  type names; do not invent synonyms for existing concepts.
- Route files remain composition-focused; feature/domain logic belongs under
  `src` boundaries recorded in the roadmap and ADRs.
- Prefer small pure functions, explicit result types, and stable reason/error
  codes over thrown strings or implicit fallbacks.
- Keep generated artifacts, migrations, and content changes reviewable and
  separate from unrelated behavioral edits.
- Format and lint with repository commands; do not hand-format around failing
  rules or disable checks without an approved reason.

## Command contract

Once Phase 1 establishes the application, every change must use the applicable
commands and `pnpm verify` must run all of them:

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm content:validate
pnpm verify
```

Add focused device/E2E, migration, scenario, or build checks when relevant.
Phase 0 contains documentation only, so these commands are reserved contracts
until BOOT-001/DX-001 makes them executable; do not pretend they passed earlier.

## Ticket workflow

Implement one narrow milestone per task. Every task states:

1. Context and required documents.
2. Exact story/ticket IDs.
3. Concrete outcome and allowed files.
4. Functional and non-functional requirements.
5. Tests and commands.
6. Explicit non-goals.
7. Expected summary and known limitations.

Before finishing:

- inspect the full diff;
- run focused and repository verification;
- exercise UI/native behavior on the physical iPhone when affected;
- add a regression test for each bug fixed;
- separate inherited failures from the requested work; and
- keep one coherent change rather than broad cleanup.

## Definition of done

A ticket is done only when:

- its stated acceptance criteria are demonstrably met;
- architecture, safety, privacy, historical integrity, and accessibility rules
  remain satisfied;
- required tests and validation pass with results reported accurately;
- documentation, schemas, fixtures, and version identifiers are updated where
  behavior changed;
- the diff contains no unrelated changes, secrets, personal export data, or
  unreviewed active content; and
- limitations, deferred work, and physical-device checks are reported.

Passing tests never overrides a failed invariant, incomplete safety review, or
missing acceptance evidence.
