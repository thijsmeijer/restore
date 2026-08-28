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
