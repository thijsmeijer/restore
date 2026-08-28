# Body-region taxonomy

This taxonomy is the canonical source for check-ins, exercise effects,
contraindications, assessments, generator targets, history, and body-map
accessibility. Slugs are stable identifiers and are never reused for a different
meaning.

## Region contract

| Field | Type | Rule |
|---|---|---|
| `slug` | lowercase snake-case string | Stable primary identity in content and imports |
| `display_name` | localized string key | Never use the slug as user-facing copy |
| `parent_slug` | nullable region slug | Hierarchy only; does not imply effect inheritance |
| `selectable` | boolean | Group-only nodes are not stored in check-ins |
| `surface` | `front`, `back`, `both`, `detail`, `none` | Default body-map presentation |
| `laterality` | `central`, `paired`, `hybrid` | Controls allowed side values |
| `geometry_key` | nullable string | Stable lookup key; SVG geometry may change independently |
| `accessibility_key` | string | Label/hint lookup for VoiceOver |

Side values are `central`, `left`, `right`, or `bilateral`:

- `central` regions allow only `central`.
- `paired` regions allow `left`, `right`, or `bilateral`.
- `hybrid` regions allow all four values.
- `bilateral` is one observation applying to both sides; it is not duplicated
  into left and right rows.

Parent regions never automatically receive a rating when a child is selected.
Aggregation for charts or targeting is an explicit, versioned calculation.

## Canonical P0 regions

| Slug | Display name | Parent | Selectable | Surface | Laterality |
|---|---|---|---:|---|---|
| `head_eyes_jaw` | Head, eyes, and jaw | — | yes | both | central |
| `neck` | Neck | — | yes | both | hybrid |
| `upper_trapezius` | Upper trapezius | — | yes | back | paired |
| `shoulder` | Shoulder | — | no | both | paired |
| `shoulder_front` | Front shoulder | `shoulder` | yes | front | paired |
| `shoulder_side` | Side shoulder | `shoulder` | yes | both | paired |
| `shoulder_rear` | Rear shoulder | `shoulder` | yes | back | paired |
| `scapular_region` | Shoulder blade area | — | yes | back | paired |
| `chest_pecs` | Chest and pectorals | — | yes | front | paired |
| `lats` | Lats | — | yes | back | paired |
| `elbow` | Elbow | — | yes | both | paired |
| `forearm` | Forearm | — | yes | both | paired |
| `wrist` | Wrist | — | yes | detail | paired |
| `hand_fingers` | Hand and fingers | — | yes | detail | paired |
| `thoracic_spine` | Thoracic spine | — | yes | back | central |
| `lumbar_spine` | Lower back | — | yes | back | hybrid |
| `pelvis_si_area` | Pelvic and SI-area region | — | yes | back | hybrid |
| `hip` | Hip | — | no | both | paired |
| `hip_front` | Front hip | `hip` | yes | front | paired |
| `hip_side` | Side hip | `hip` | yes | both | paired |
| `hip_deep_rotation` | Deep hip rotation area | `hip` | yes | both | paired |
| `glutes` | Glutes | — | yes | back | paired |
| `adductors_groin` | Adductors and groin | — | yes | front | paired |
| `hamstrings` | Hamstrings | — | yes | back | paired |
| `quadriceps` | Quadriceps | — | yes | front | paired |
| `knee` | Knee | — | yes | both | paired |
| `calf` | Calf | — | yes | back | paired |
| `ankle` | Ankle | — | yes | both | paired |
| `foot_toes` | Foot and toes | — | yes | detail | paired |

The `pelvis_si_area` label is anatomical navigation only and must never be used
to imply an SI-joint diagnosis.

## Canonical movement and intent tags

### Intended effects

`down_regulate`, `breathe_expand`, `decompress`, `mobilize`, `explore_range`,
`improve_tolerance`, `activate_lightly`, `stabilize_control`, `integrate`,
`prepare_for_load`, `recover_after_load`, `reassess`

### Movement patterns

`flexion_extension`, `rotation`, `lateral_flexion`, `abduction_adduction`,
`internal_external_rotation`, `protraction_retraction`,
`elevation_depression`, `pronation_supination`,
`wrist_flexion_extension_deviation`, `ankle_dorsiflexion_plantarflexion`,
`segmental_spinal_movement`, `overhead_position`, `shoulder_extension`,
`straight_arm_scapular_position`, `compression`, `squat_pattern`,
`hinge_pattern`

### Session phases

`arrival`, `warm_motion`, `targeted_mobility`, `controlled_range`,
`integration`, `cooldown`, `reassessment`

Tags may be deprecated but not silently redefined. Imports containing unknown
slugs or tags fail validation with a path-specific error.

## Coverage rule

Before first release, every selectable region must have reviewed content for:

- at least one gentle option;
- at least one targeted option;
- at least one controlled-range or stability option;
- at least one no-equipment option; and
- at least one valid replacement path.

One exercise may satisfy several coverage cells. Coverage is validated from
metadata and then manually reviewed; counts alone are not approval.
