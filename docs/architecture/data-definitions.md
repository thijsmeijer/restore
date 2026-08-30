# P0 data definitions

This document defines the logical P0 domain model independently of SQLite,
Drizzle, React Native, and UI forms. Phase 2 may normalize storage further, but
must preserve these meanings and constraints.

## Shared conventions

- Durable entities use application-generated ULIDs encoded as strings.
- Timestamps are UTC ISO-8601 instants; user-local date/time and IANA time-zone
  identifiers are stored separately where scheduling semantics require them.
- Enumerations are stable lowercase snake-case values.
- Symptom ratings are nullable integers from 0–10. `null` means not reported;
  `0` means explicitly none.
- Readiness and training stress are nullable integers from 1–5.
- Region observations use the taxonomy’s canonical slug and allowed side.
- Historical facts are append-only after completion. Corrections create a
  linked correction record rather than rewriting interpreted history.
- Mutable preferences use `created_at` and `updated_at`; destructive operations
  are explicit and transactional.
- Versioned JSON snapshots are validated on write and read.

## Profile and context

### `user_profile`

Single local owner record:

- `id`, `created_at`, `updated_at`.
- Ordered goal slugs.
- Preferred quick, normal, and deep durations, each 2–90 minutes.
- Units and coaching/cue preference.
- Onboarding completion timestamp.
- Safety acknowledgement rules version and timestamp.

Goals and preferences are mutable. Historical routines store the relevant
profile input snapshot, so profile edits never reinterpret old results.

### `profile_goals`

- `id`, `user_profile_id`, canonical goal slug, and zero-based priority order.
- Unique per profile/goal and profile/order pair.

The P0 goal slugs are `move_better`, `reduce_stiffness`,
`prepare_for_calisthenics`, `improve_posture`, `wind_down`, and
`maintain_joints`.

### `profile_body_regions`

- `id`, `user_profile_id`, canonical selectable body-region slug, and allowed
  side.
- Unique per profile/region; `bilateral` remains one selection rather than two
  inferred rows.

This optional baseline records an area the owner wants Restore to consider. It
does not store a diagnosis or silently create a symptom rating.

### `profile_training_split`

- `id`, `user_profile_id`, canonical training type, and zero-based order.
- Unique per profile/type and profile/order pair.

The onboarding inventory uses the same P0 training types as training sessions.

### `equipment`

- Stable `id`, unique `slug`, display-name key, category, active flag.
- Seeded/versioned reference data.

### `user_equipment`

- `id`, `equipment_id`, environment slug, available flag, optional local note,
  timestamps.
- Unique per equipment/environment pair.

ONB-001 records selected inventory against the `home` environment. CHK-001 owns
the per-check-in environment and active-equipment snapshot; onboarding never
assumes home equipment is available elsewhere.

### `body_regions`

Seeded/versioned representation of the canonical taxonomy:

- Slug, display/accessibility keys, parent slug, selectable flag, surface,
  laterality, geometry key, active flag, content version.

Existing slugs may be retired but never reassigned.

### `training_sessions`

- `id`, local calendar date, optional start/end instants.
- Type: `pull`, `push`, `legs`, `planche`, `front_lever`, `handstand`,
  `mixed_skills`, `weighted_strength`, `running`, or `rest`.
- Status: `planned`, `completed`, `skipped`, or `changed`.
- Nullable 1–5 stress, exposure tags, source (`manual` in P0), timestamps.
- A changed session links to the superseding entry rather than overwriting the
  prior plan.

## Check-in and safety

### `check_ins`

- `id`, observation timestamp, local date, and time-zone identifier.
- Session intent/mode and available minutes from 2–90.
- Nullable readiness, selected environment, and active equipment snapshot.
- Optional planned and completed training references.
- Optional local-only free-text note.
- Safety result: `clear`, `gentle_only`, or `blocked`.
- Safety rules version, ordered matched-rule IDs, and ordered reason-code list.
- Creation source and timestamps.

`capture_status` distinguishes a durable `captured` form from a `submitted`
check-in. CHK-001 may persist `captured` records with null safety fields while
the safety classifier is not yet shipped. Captured records are never eligible
for generation. SAFE-001 owns the atomic transition that stores the safety
result, rules version, and ordered reason codes before setting `submitted`.

A submitted check-in is immutable. Editing creates a replacement linked by
`supersedes_check_in_id`; generated routines retain the original snapshot.

### `check_in_safety_responses`

- Check-in ID, stable structured signal ID, explicit reported boolean, and
  deterministic rule order.
- Stores a response for every rule in the submitted rules version, including
  explicit false responses; selected signals alone are not treated as proof
  that the complete gate was answered.
- Global stop signs live here rather than on a body region because trauma,
  dizziness, chest symptoms, breathing difficulty, and rapid worsening are not
  reliably region-specific.
- The classifier writes these responses while the check-in is `captured`, then
  stores the versioned result and changes it to `submitted` in the same
  transaction.

### `check_in_focus_regions`

- `id`, `check_in_id`, selected region slug, and allowed side.
- Records that the user wants a routine to focus on an area without requiring
  a symptom or severity rating.
- Unique `(check_in_id, region_slug, side)`.

### `check_in_regions`

- `id`, `check_in_id`, region slug, allowed side.
- Nullable stiffness, soreness, and discomfort ratings from 0–10.
- Unique `(check_in_id, region_slug, side)`.

At least one rating must be present. Missing data is never coerced to zero.

Schema version 5 adds the safety-response table and matched-rule-ID column
without rewriting owner data. Existing schema-4 check-ins remain `captured`,
retain their exact snapshots, and are not eligible for generation; a new
submitted check-in is required. Export/import is not implemented yet, so
SAFE-001 adds no released export-format change.

## Versioned content

### `content_packs`

- `id`, schema version, content version, created timestamp, review status,
  checksum, and import source.
- Released version/checksum combinations are immutable.

### `exercises`

Stores the versioned exercise contract defined in the content specification:

- Stable identity plus version, slug, review/active state, instruction keys,
  prescription, intensity, phases, patterns, media, allowed modes, review
  metadata, timestamps.
- Unique `(id, version)` and `(slug, version)`.

### `exercise_effects`

- Exact exercise ID/version, region slug, side behavior, intended effect,
  bounded magnitude, movement plane/pattern, primary flag.

### `exercise_requirements`

- Exact exercise ID/version and structured equipment, environment, position,
  space, and setup requirements.

### `exercise_contraindications`

- Stable rule ID, exact exercise ID/version, severity, structured match,
  concrete caution effect where applicable, reason key, and review metadata.

### `exercise_relations`

- Source and target exercise identities/version policy, relation type, supported
  contexts, and intent-preservation metadata.

### `routine_templates`

- Stable ID and version, mode, inclusive duration range, allowed safety states,
  intensity ceiling, ordered required/optional phases, phase budgets, fallback
  policy, review status.

All content entities are immutable once included in a released pack.

## Generation and routine editing

### `generated_routines`

- `id`, generation timestamp supplied by the caller.
- Check-in ID and full versioned generation-input snapshot.
- Template ID/version, mode, estimated duration.
- Engine, rules, configuration, schema, and content versions.
- Seed, target priorities, routine explanation, and complete validation report.
- Status: `draft`, `ready`, `started`, `completed`, `abandoned`, or
  `superseded`.
- Optional `supersedes_routine_id` for regeneration.

Input and validation snapshots are immutable after the routine reaches `ready`.

### `routine_items`

- `id`, routine ID, zero-based order, phase.
- Exact exercise ID/version.
- Exact prescription: type, dose, sets, tempo, side sequence, rest, transition.
- Stable selection reason codes plus user-facing explanation key/parameters.
- Alternative identities valid at generation time.
- Optional replacement lineage and edit source.

Order is unique within a routine. A ready routine cannot contain duplicate item
or exercise identities unless a future explicitly versioned template permits a
repeat; P0 does not.

### `saved_routines`

- `id`, source routine ID, local name, pinned flag, created/updated timestamps.
- References an immutable ready routine snapshot. Regeneration creates a new
  routine and updates the saved pointer explicitly.

## Session facts and outcomes

### `session_logs`

- `id`, routine ID, started/completed timestamps.
- Status: `active`, `paused`, `completed`, `finished_early`, `abandoned`, or
  `safety_stopped`.
- Actual duration, completion percentage 0–100, current item/state checkpoint,
  and background/interruption counters.
- App/runtime/schema/content/engine versions.

The active checkpoint is mutable during execution. Completion freezes the fact
fields; later correction uses a linked correction event.

### `session_item_logs`

- `id`, session ID, routine-item ID, start/end timestamps.
- Actual dose, sets, sides, and elapsed time.
- Result: `completed`, `skipped`, `replaced`, `stopped_wrong`, or `not_reached`.
- Immediate response: `helpful`, `neutral`, `uncomfortable`, or not reported.
- Optional local-only note and replacement item ID.

### `session_outcomes`

- `id`, session ID, submitted timestamp.
- Nullable usefulness and intensity-fit values on documented UI scales.
- Before/after region observations stored as exact values, not only deltas.
- Optional local-only note.

Only one active outcome exists per session; a correction preserves the original
and links to it.

### `exercise_preferences`

- `id`, stable exercise identity, favorite flag, avoid state (`none`,
  `temporary`, `permanent`), optional expiry, personal cue, manual priority,
  timestamps.
- Avoid changes are explicit user actions; inferred behavior never creates a
  permanent avoid.

### `exercise_response_stats`

Rebuildable derived data keyed by exercise identity, region, and P0 context:

- Eligible attempts, helpful/neutral/uncomfortable counts, preference-qualified
  skips/replacements, bounded ranking contribution, source-through timestamp,
  calculation version.

Safety stops and constraint-driven replacements do not become negative
preference evidence. Deleting source sessions transactionally rebuilds or
invalidates affected aggregates.

## Progress, plans, and notifications

### `plans`

- `id`, local name, enabled flag, created/updated timestamps.

### `plan_slots`

- `id`, plan ID, weekdays, local time or time window, time-zone behavior.
- Mode/template or saved-routine reference.
- Optional training relationship (`before`, `after`, `independent`).
- Enabled flag and next evaluation timestamp.

### `notification_preferences`

- Authorization state mirror, global enabled flag, quiet-hour window, time-zone
  behavior, maximum daily desk reminders, default snooze minutes, timestamps.
- The app remains functional when permission is denied or revoked.

### `scheduled_notifications`

- `id`, owning plan slot or desk rule, platform identifier, intended local and
  UTC fire times, deep-link payload version, state, created/updated timestamps.
- State: `scheduled`, `delivered`, `snoozed`, `skipped`, `cancelled`, or
  `superseded`.

Deep links identify intent and stable entities; they never embed sensitive notes
or trust a stale routine without revalidation.

### Derived progress views

Weekly minutes, completion, regional trends, body-map aggregates, and exercise
effectiveness are derived from immutable facts. They are not independent source
records. Calculations distinguish no observation from an explicit zero and
carry a calculation version where cached.

## Diagnostics and schema lifecycle

### `app_events`

- `id`, event timestamp, event type, severity, structured redacted payload,
  redaction category, app/runtime versions, expiry timestamp.
- No free-text health note or media is included by default.

### `schema_metadata`

- Database schema version, content version, migration state.
- Last successful pre-migration backup ID/checksum and timestamps.
- Last import/export schema version and integrity result.

### `migration_history`

- Migration ID, from/to schema versions, start/end timestamps, backup reference,
  status, checksum, and failure reason code.

Released migrations are forward-only. Startup must recover or stop safely after
an interrupted migration; it must never silently continue with partially
migrated data.

## Import/export envelope

The versioned JSON export contains:

- export schema version, creation timestamp, app/schema/content versions;
- checksums and record counts;
- all owner domain records and required referenced historical content snapshots;
- no cache or derived aggregate that cannot be rebuilt.

Import validates into temporary storage, checks referential and historical
integrity, reports conflicts, and commits atomically only after validation. It
backs up existing data before replacement. CSV exports are human-readable views
of check-ins, sessions, outcomes, and future assessments; they are not a lossless
restore format.

Delete-all requires explicit confirmation and transactionally removes the
database, local media, exports/backups selected by the user, cached data,
SecureStore values, and pending notifications. The app then returns to a fresh
onboarding state.

## P0 exclusions

Assessments, camera media, HealthKit samples, authentication, sync records,
remote content, and AI artifacts are not P0 entities. Adding them requires a new
or amended ADR and versioned data-contract changes.
