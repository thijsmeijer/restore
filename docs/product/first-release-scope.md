# Restore first-release scope

- **Status:** Approved
- **Decision date:** 28 August 2026
- **Approved by:** Thijs, 28 August 2026
- **Authority:** This document resolves first-release conflicts in the product
  roadmap. It does not remove later backlog items.

## Release outcome

The first release must complete one offline loop on a personal iPhone:

```text
onboard → check in → safety gate → generate → review → perform → report → inspect history
```

The loop must remain useful without an account, network, backend, HealthKit,
AI, camera analysis, or another Restore product.

## Included product capabilities

| Capability | Binding first-release behavior | Backlog source | Delivery phase |
|---|---|---|---:|
| Profile | Goals, body baseline, equipment, training split, preferred durations, safety acknowledgement, editable local profile | ONB-001–007, ONB-010 editing behavior | 3 |
| Check-in | Accessible front/back body map; side; stiffness, soreness, discomfort; 2–90 minutes; readiness; training and environment; note; safety gate | CHK-001–008 | 4 |
| Exercise content | Approximately 45–60 reviewed, versioned movements with complete instructions, metadata, media fallback, filters, favorites, avoids, and replacement paths | LIB-001–005, LIB-009 validation behavior | 2, 5 |
| Generation | Deterministic offline generation, hard filtering, duration budgeting, sequencing, explanations, replacements, regeneration, exact version/seed capture, safe fallback | GEN-001–010 | 6, 7 |
| Basic learning | Favorites, avoids, immediate response, skips, and replacements influence ranking through bounded, inspectable configuration; hard filters always win | FDB-003–004 plus normalized P0 decision | 6, 9 |
| Routine review | Preview phases, reasons, dosage, replacement, reorder/remove, regeneration, save, and validation after edits | GEN-006–008 and roadmap Phase 7 | 7 |
| Session player | Timed, rep, hold, side, rest, transition, automatic advance, large manual controls, media, audio, haptics, background recovery, replacement/regression, and complete logs | SES-001–007 | 8 |
| Outcomes | Before/after regional values, usefulness, intensity fit, exercise response, completion, skips, and replacements | FDB-001–004 | 9 |
| Progress | Session history, weekly minutes, consistency, regional trends, helpful/avoided exercises, and a basic body heatmap | PRO-001–002 plus roadmap Phase 9 | 9 |
| Plans and reminders | Saved routines, basic weekly slots, desk reminders, quiet hours, snooze/skip, full disable, and notification deep links | PLN-001–004 | 10 |
| Data lifecycle | Versioned JSON export/import, CSV export, delete-all, pre-migration backup, migration fixtures, and immutable historical versions | DAT-001–004 | 2, 21/DATA-001 |
| Personal installation | EAS development build during active work and internal preview build for daily use on the registered iPhone | RELEASE-001 | 1, 22 |
| Developer controls | Seed import, content validation, structured logs, feature flags, database/content inspection, reproducible generation, and engine rejection trace | DEV-001–004 and P0 developer inventory | 1, 2, 6 |

## Normalized decisions

These decisions supersede contradictory labels elsewhere in the roadmap:

1. **Automatic advance is P0.** Rich voice coaching remains P1.
2. **Basic bounded response ranking is P0.** Phase 11 owns contextual response
   models, delayed outcomes, confidence/minimum-sample policy, dose adaptation,
   and advanced “why this changed” behavior.
3. **The complete safe data lifecycle is P0.** Import, delete-all, and migration
   backup are not deferred merely because the short release list mentioned only
   exports.
4. **Previous-check-in comparison and reusable check-in presets are P1.** They
   are removed from Phase 4’s P0 exit requirements.
5. **Notification preferences in onboarding are a placeholder.** Actual
   scheduling and system permission requests begin only in Phase 10.

## Explicitly deferred

- HealthKit and recovery integrations.
- Laravel or any other backend.
- Login, cloud backup, and multi-device sync.
- Natural-language/voice AI and remote AI providers.
- Camera analysis and camera-derived assessments.
- Widgets, App Intents, Live Activities, and Dynamic Island.
- Apple Watch and Personal OS integration.
- Custom exercise authoring for automatic selection.
- Previous-check-in comparison and reusable check-in presets.
- Advanced personalization described above.
- Public App Store work, subscriptions, social features, and multi-tenancy.

## Release-wide acceptance criteria

- A normal check-in is comfortably achievable in under 30 seconds, and an
  extended check-in with optional body or training detail stays under one
  minute.
- At standard Dynamic Type, the main check-in path uses compact guided states
  without vertical scrolling. Accessibility text sizes may scroll rather than
  clip or hide controls, and optional detail sheets may scroll.
- A recommended routine can start within three meaningful taps from Today.
- Normal local generation targets under 300 ms and returns within ±10% of the
  requested duration or one indivisible short exercise.
- There are zero hard safety, equipment, environment, avoidance, dosage, or
  sequencing violations in the scenario suite.
- The full core loop works in airplane mode and after app restart.
- A generated routine is reproducible from its input snapshot, content version,
  rules version, engine version, and seed.
- Export → clean install → import round-trips without losing historical meaning.
- Accessibility includes VoiceOver labels, Dynamic Type, Reduce Motion, no
  color-only state, and large touch targets.
- A development and an internal-preview build have each run on the physical
  iPhone.
- The safety policy and active exercise content receive qualified clinical
  review before the build becomes a daily-use tool.

## Approval gate

Phase 0 scope was approved by the owner on 28 August 2026 and is now frozen.
Later changes require a dated decision entry explaining the reason, affected
stories, migration or compatibility impact, and release impact.
