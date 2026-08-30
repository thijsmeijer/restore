# Exercise-content contract

This document defines the Phase 0 content contract. Phase 2 will implement it as
versioned Zod schemas and validated seed/import formats without changing its
meaning silently.

## Version envelope

Every content pack has:

```text
schema_version
content_version
created_at
review_status
exercises[]
routine_templates[]
```

`schema_version` changes when the wire shape or validation semantics change.
`content_version` changes whenever selectable content, relationships, dosage,
contraindications, or explanations change. Released versions are immutable.

`review_status` is `draft`, `engineering_reviewed`, `clinical_reviewed`, or
`retired`. Daily-use builds select only the exact clinically reviewed versions.
Development builds may show other versions only behind an explicit debug flag.

## Exercise definition

| Field | Type | Required rule |
|---|---|---|
| `id` | UUID/ULID | Immutable identity shared by versions |
| `slug` | string | Stable human-readable identity; unique among exercises |
| `version` | positive integer | Immutable revision; unique with `id` |
| `status` | review status | See version envelope |
| `name_key` | localization key | Required |
| `summary_key` | localization key | Required and non-diagnostic |
| `instructions` | object | Setup, execution, breathing, common errors, stop rules |
| `prescription` | object | Type, default/min/max dose, sets, rest, tempo, sides |
| `intensity` | enum | `very_gentle`, `gentle`, `moderate`; P0 has no higher automatic tier |
| `phases` | non-empty tag list | Canonical session phases |
| `movement_patterns` | non-empty tag list | Canonical movement tags |
| `effects` | non-empty effect list | Region, side applicability, intended effect, magnitude, plane |
| `requirements` | object | Equipment, environment, position, space, setup cost |
| `contraindications` | list | Structured hard exclusion or caution with reason key |
| `relations` | list | Alternative, regression, progression, prerequisite, or pairing |
| `media` | object | Optional local video/animation/audio plus required text fallback |
| `allowed_modes` | non-empty mode list | Modes where automatic selection is valid |
| `dosage_limits` | object | Per-routine and optional weekly ceilings; extension/progression rules |
| `review` | object | Reviewer roles, dates, reviewed version, notes reference |
| `created_at` | timestamp | Required |
| `retired_at` | nullable timestamp | Retirement never deletes historical versions |

All localization and media references must resolve. Missing media never makes
instructions unusable; complete text remains mandatory.

## Prescription types

P0 supports `timed_hold`, `timed_movement`, `repetitions`, `breathing_cycles`,
and `reassessment`. Every type defines a deterministic duration estimate,
including transitions, side switches, sets, and rest.

The prescription must state whether it is unilateral, bilateral simultaneous,
bilateral sequential, or central. Side behavior must be compatible with every
target effect and contraindication.

## Effect entry

Each effect contains:

- canonical `region_slug`;
- allowed side behavior;
- canonical intended-effect tag;
- bounded magnitude used only by configured scoring;
- movement plane/pattern where relevant; and
- whether the effect is primary or supporting.

Effects describe selection intent, not a guaranteed physiological outcome.

## Requirement entry

Requirements use stable equipment and environment slugs. P0 environments are
`home`, `desk`, `gym`, `travel`, and `custom`. Space is a bounded category,
not free text. Required equipment uses `all_of`; alternatives use explicit
`any_of` groups so the hard filter is unambiguous.

## Contraindication entry

Each rule contains:

```text
rule_id
severity: hard_exclusion | caution
region_slug and side match
symptom qualities and rating threshold
recent_trauma flag
position/demand flags
allowed safety states
reason_key
review metadata
```

A caution must declare its concrete effect: reviewed dose cap, reviewed variant,
or user warning. A bare score penalty is invalid.

## Relations

Relations reference an exact exercise identity and declare whether compatible
versions may float or are pinned. A selectable exercise must have a valid safe
replacement/regression path for each context it claims to support. Cyclic
progression/regression graphs are invalid. Alternatives must preserve the
declared primary intent and pass independent validation.

## Validation failures

Content is rejected for:

- unknown or duplicate identifiers, regions, tags, modes, or equipment;
- missing instruction, stop-rule, text-fallback, review, or version fields;
- impossible or non-monotonic dosage bounds;
- incompatible side metadata;
- unresolved or cyclic relationships;
- a selectable draft/retired version in a release pack;
- a hard contraindication without an accessible reason;
- an alternative that cannot meet its declared purpose; or
- any mutation of an already released `(id, version)` pair.

Validation reports JSON-path-like locations and stable error codes. Phase 2’s
`pnpm content:validate` command must be deterministic and CI-failing.

## CONTENT-001 schema-version 1 decisions

The initial source catalog is split into reviewable JSON files:

- `manifest.json` owns the version envelope, exercises, and the currently empty
  routine-template list;
- `body-regions.json` owns body-region reference records;
- `equipment.json` owns equipment reference records;
- `modes.json` owns the known session-mode slugs used for cross-reference
  validation;
- `localization-keys.json` owns resolvable user-facing text keys; and
- `media-assets.json` owns resolvable local media paths.

All objects reject unknown fields. Identifiers are UUIDs or canonical Crockford
ULIDs; slugs are lowercase snake case; timestamps are UTC ISO-8601 values; and
content versions use semantic versioning. Reference records carry their content
version so a mixed-version catalog fails closed.

Schema version 1 uses these bounded wire values where the Phase 0 contract gave
categories but not spellings:

- exercise side mode: `unilateral`, `bilateral_simultaneous`,
  `bilateral_sequential`, `central`;
- effect side: `central`, `left`, `right`, `bilateral`;
- position: `standing`, `seated`, `kneeling`, `half_kneeling`, `quadruped`,
  `supine`, `prone`, `side_lying`, `hanging`, `supported`;
- space: `minimal`, `small`, `medium`, `large`;
- setup cost: `low`, `medium`, `high`;
- relation version policy: `pinned` or `compatible`; and
- demand flags: `weight_bearing`, `balance`, `end_range`, `neck_position`,
  `wrist_extension`, `shoulder_extension`, `spinal_flexion`,
  `spinal_extension`, `equipment_stability`.

Equipment categories and symptom-quality values remain stable snake-case
identifiers because their complete P0 catalogs are owned by CONTENT-002 and
SAFE-001 respectively. The validator still rejects duplicates and cross-record
references not present in the supplied catalogs.

## GEN-001 routine-template and preparation decisions

Schema version 1 routine templates define an inclusive 2–90 minute range, one
P0 mode, allowed non-blocked safety states, an intensity ceiling, ordered
required or optional phases, and minimum/target/maximum phase shares expressed
as basis points. Target shares total exactly 10,000; the minimum and maximum
envelope must contain that total. The only P0 fallback policy is
`explicit_failure`. Duplicate phases, impossible duration or phase bounds,
unknown modes, incomplete review records, and a `gentle_only` template above
`very_gentle` are rejected.

The pure GEN-001 preparation boundary validates the immutable generation-input
snapshot and exact content/rules/configuration/engine versions, enforces a
blocked safety result, selects exactly one clinically reviewed compatible
template, and applies hard candidate filters. An exercise is eligible only when
the pack is clinically reviewed, its exact version has matching engineering and
clinical review records, and it passes contraindication, avoidance, mode,
environment, equipment stability, space, side, intensity, and minimum-duration
checks. The input safety-rules version must exactly match the supplied versioned
generation rules. Cautions remain attached to an eligible candidate as stable
rule IDs. No preference or history value can override a rejection.

GEN-001 returns a prepared eligible-candidate set or a stable explicit failure;
it does not score, allocate phase duration, sequence exercises, write a routine,
or expose generator UI. Those behaviors start in GEN-002. The bundled catalog
still contains no templates and only draft exercises, so it intentionally
cannot produce a daily-use routine until the exact template, safety rules, and
exercise versions receive the required review.

## GEN-002 engine version 0.2.0 decisions

Generation-input schema version 2 adds a caller-supplied routine identity and
distinguishes preference-qualified skips and replacements from time, equipment,
or safety-driven events. The engine never interprets an unqualified skip as a
negative preference. Engine, content, generation rules, configuration, and
safety-rules versions must still match exactly.

Target priority follows the stored target order through bounded basis-point
weights in the versioned rules. Candidate scoring runs only after hard filtering
and exposes integer terms for target and primary-effect matches, intent,
ordered profile goals through versioned goal-to-effect mappings, compatible
planned/completed training context, favorite, bounded immediate response
history, and recent exposure. Individual response terms and their combined
contribution are capped by configuration. A supplied seed breaks only otherwise
stable ties; it cannot alter eligibility or any safety decision.

The builder satisfies required template budgets first, attempts high-priority
target coverage, fills remaining template targets, and adjusts exact dose within
reviewed exercise and caution limits. It forbids duplicate exercises, limits
repeated movement patterns, preserves template order, and emits only eligible,
non-selected reviewed alternatives. The final validator independently checks
eligibility, cautions, prescription bounds, duration arithmetic, ordering,
template budgets, movement-pattern limits, alternatives, and target coverage.
Every unaddressed high-priority target carries a stable omission reason.

Successful routines stay within configured duration tolerance or record the
permitted one-indivisible-exercise difference. Otherwise generation returns an
explicit `duration_unfillable`, `phase_unfillable`, or `routine_invalid`
failure; it never returns an unexplained empty routine. Scoring, prescriptions,
reason codes, input snapshot, versions, seed, validation report, and exact
exercise identities are part of the reproducible output. SQLite persistence,
developer trace UI, routine preview, editing, and session playback remain later
tickets. The bundled pack is still draft-only and intentionally produces no
routine.

## CONTENT-002 draft catalog decisions

Content version `0.1.0` seeds all 29 canonical body-region nodes from the body
taxonomy. The `shoulder` and `hip` grouping nodes are active reference records
but remain non-selectable and have no geometry key; each selectable child owns
its own geometry lookup.

The initial equipment slugs are `mat`, `resistance_band`, `parallettes`,
`pull_up_bar`, `dip_bars`, `wall`, `bench`, `foam_roller`, `massage_ball`, and
`cable_stack`. A wall is modeled as a required support when an exercise depends
on it, rather than being assumed available in every environment.

The P0 mode catalog contains `daily_restore`, `morning_primer`,
`pre_workout_prep`, `post_workout_reset`, `desk_rescue`, `night_downshift`,
`targeted_area`, `pain_aware_gentle`, `deep_restoration`, `gym`, `skill_prep`,
`recovery_day`, and `emergency_reset`. The broader-roadmap `travel` and
`assessment` session modes are not included because they are post-P0; `travel`
remains an environment supported by compatible P0 exercises.

The first ten exercises are five exact, pinned alternative pairs covering
breathing, thoracic rotation, scapular control, wrist range exploration, and hip
rotation. They are seed examples, not active guidance: the pack and every
exercise remain `draft`, reviewer fields are null, contraindication lists await
reviewed SAFE-001 metadata, no media is claimed, and no draft is allowed in the
`pain_aware_gentle` mode. Localization references are registered for validation.
LIB-001 adds complete English draft copy for product review and validates
one-to-one copy coverage before SQLite installation, but the copy is not
clinically approved. Reviewed user-facing copy, contraindications, and clinical
approval are required before any exercise status can advance or become eligible
for a daily-use routine.

## Minimal illustrative record

```json
{
  "id": "01EXAMPLE000000000000000001",
  "slug": "example_thoracic_rotation",
  "version": 1,
  "status": "draft",
  "name_key": "exercise.example.name",
  "summary_key": "exercise.example.summary",
  "instructions": {
    "setup_key": "exercise.example.setup",
    "execution_key": "exercise.example.execution",
    "breathing_key": "exercise.example.breathing",
    "common_error_keys": ["exercise.example.error.1"],
    "stop_rule_keys": ["exercise.stop.general", "exercise.example.stop.1"]
  },
  "prescription": {
    "type": "repetitions",
    "default": 6,
    "minimum": 3,
    "maximum": 8,
    "sets": 1,
    "rest_seconds": 0,
    "tempo": "controlled",
    "side_mode": "bilateral_sequential"
  },
  "intensity": "gentle",
  "phases": ["warm_motion", "targeted_mobility"],
  "movement_patterns": ["rotation"],
  "effects": [{
    "region_slug": "thoracic_spine",
    "side_mode": "bilateral",
    "effect": "mobilize",
    "magnitude": 2,
    "primary": true
  }],
  "requirements": {
    "equipment": {"all_of": [], "any_of": []},
    "environments": ["home", "desk", "gym", "travel"],
    "position": "seated",
    "space": "small",
    "setup_cost": "low"
  },
  "contraindications": [],
  "relations": [],
  "media": {"text_fallback_required": true},
  "allowed_modes": ["daily_restore", "desk_rescue"],
  "dosage_limits": {"max_sets_per_routine": 2, "extendable": false},
  "review": {"engineering": null, "clinical": null},
  "created_at": "2026-08-28T00:00:00Z",
  "retired_at": null
}
```

The example is intentionally `draft` and must never be shipped as active
exercise guidance.
