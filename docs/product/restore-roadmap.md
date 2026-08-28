# Restore — Personal Mobility & Body Restoration App

**Complete product blueprint, user-story backlog, technical roadmap, and iPhone delivery plan**  
**Owner:** Thijs  
**Status:** Product definition / build-ready  
**Version:** 1.0  
**Prepared:** 28 August 2026

> [!IMPORTANT]
> Phase 0 normalization decisions are recorded in
> [`first-release-scope.md`](./first-release-scope.md). When a priority or phase
> in this roadmap conflicts with that document, the Phase 0 scope document is
> authoritative for the first release. The broader roadmap remains the product
> vision and backlog source.

---

## 1. Product in one sentence

**Restore answers “What does my body need today?” by combining a fast body check-in, recent training, available time, equipment, and recovery context into a safe, personalized, guided mobility session that learns what actually works for you.**

---

## 2. Product vision

Restore is not a static stretching library and not another workout tracker. It is a personal **body-maintenance operating system** for an active calisthenics athlete who also spends substantial time sitting.

The product should help with recurring stiffness or discomfort around the neck, shoulders, thoracic spine, wrists, hips, and lower back while supporting planche, front lever, handstand, pulling, pushing, and leg training. It deliberately focuses on mobility, posture, breathing, movement control, stability, and recovery—not strength programming, which is handled elsewhere.

The ideal daily experience is:

1. Open Restore.
2. Mark how the body feels in under 30 seconds.
3. Select what training happened or will happen.
4. Choose 5–90 available minutes.
5. Receive a routine with a clear explanation of why each movement was selected.
6. Follow a polished timer-led session with video, audio, haptics, and substitutions.
7. Report what improved, what did not, and what felt wrong.
8. Let Restore become increasingly personal over time.

---

## 3. North-star outcome

> **The app should reliably make the user feel and move better today while gradually reducing recurring stiffness and asymmetry over months.**

Supporting product outcomes:

- Starting a useful session should take no more than three meaningful taps after opening the app.
- A daily check-in should usually take less than 30 seconds.
- Every generated routine must satisfy safety, equipment, time, and sequencing constraints.
- The app must work fully offline.
- The user must be able to understand why a drill was selected.
- The app should learn from actual response rather than assuming every “good” mobility drill works equally well for everyone.
- No health data should leave the device unless an explicit optional sync or AI feature is enabled.

---

## 4. Primary user and known context

Restore is initially a single-user personal app built around the following real use case:

- Active calisthenics training approximately five to six times per week.
- Skills and movements include front lever, planche, handstand, weighted pulling, dips, push work, pull work, leg work, and skill sessions.
- Frequent stiffness or discomfort in the neck, shoulders, wrists, thoracic spine/back, hips, and sometimes lower back.
- Significant sitting outside training.
- Equipment can include a mat, resistance bands, parallettes, pull-up bar, dip bars, wall, bench, foam roller or ball, and normal gym equipment.
- Strength programming is explicitly out of scope for Restore; low-load activation, stability, motor control, and graded mobility work are in scope.
- Session lengths range from an emergency two- or five-minute reset through a 60–90-minute deep restoration session.
- The app is intended for personal use on an iPhone first.

---

## 5. Product principles

### 5.1 Local-first and private

The first useful version requires no account, backend, subscription, or internet connection. SQLite on the phone is the source of truth. Cloud sync, an API, and AI are optional later additions.

### 5.2 Deterministic before “AI”

The first routine engine should be rules-based, explainable, reproducible, and heavily tested. AI may interpret free-form input or explain patterns later, but it may not invent unreviewed exercises or bypass safety rules.

### 5.3 Daily usefulness beats feature count

The core loop—check in, generate, perform, report—must feel excellent before HealthKit, camera analysis, Watch support, or advanced analytics are added.

### 5.4 Personal evidence beats generic advice

Restore should learn that a particular drill reliably improves right wrist extension, that another aggravates a shoulder, or that desk resets reduce evening neck stiffness. Recommendations should increasingly reflect the user's own outcomes.

### 5.5 Friction is the enemy

Most fields are optional, sensible defaults are remembered, routines can start immediately, and the app never forces a long questionnaire when a five-minute reset is needed.

### 5.6 Native-quality interaction

The app should feel designed for iPhone: smooth transitions, one-handed use, haptics, Live Activities, widgets, Shortcuts, Dynamic Island/Lock Screen progress, and eventually an Apple Watch companion.

### 5.7 Safe by construction

Every exercise, routine, and progression has explicit metadata, contraindications, dosage limits, and stop rules. High-risk or ambiguous input should produce a conservative response rather than a confidently improvised routine.

---

## 6. Scope boundaries

### In scope

- Mobility and flexibility.
- Joint control and controlled articular rotations.
- Posture-oriented movement practice.
- Breathing and down-regulation.
- Low-load activation and stability.
- Pre-training preparation.
- Post-training restoration.
- Desk and phone-use resets.
- Symptom and stiffness tracking.
- Range-of-motion assessments.
- Personal routine generation.
- Recovery-informed adaptation.
- Calisthenics-specific preparation and restoration.

### Explicitly out of scope for the initial product

- Strength-program generation.
- Medical diagnosis.
- Injury rehabilitation plans that claim to replace a clinician.
- Medication or supplement advice.
- Social feeds, coaching marketplaces, payments, subscriptions, or public communities.
- Multi-tenant SaaS architecture.
- Public App Store growth work.

### Possible future expansion

- A shared Personal OS with a separate calisthenics app such as Leverly.
- Clinician-exportable reports.
- Multi-device sync.
- Apple Watch and iPad companion experiences.
- Carefully constrained AI assistance.

---

## 7. Core product loop

```text
Context + body check-in
        ↓
Safety gate
        ↓
Priority and intent calculation
        ↓
Routine generation
        ↓
Guided session
        ↓
Exercise- and session-level feedback
        ↓
Personal response model
        ↓
Better next recommendation
```

The loop must remain available offline and must still work when every advanced integration is disabled.

---

## 8. Main application structure

### Tab 1 — Today

The default home screen and most important part of the app.

- Current body snapshot.
- “How do you feel?” quick check-in.
- Planned or completed training context.
- Available-time selector.
- Recommended routine card.
- Emergency quick actions: 2-minute, 5-minute, desk reset, wrists, neck, full body.
- Current streak and weekly mobility minutes, shown without guilt-heavy design.
- Contextual insight such as “Your right wrist has been marked stiff after three recent planche sessions.”

### Tab 2 — Library

- Exercises.
- Saved routines.
- Protocols.
- Assessments.
- Favorites.
- Recently effective drills.
- Search and filters.
- Personal notes and technique cues.

### Tab 3 — Progress

- Body heatmap over time.
- Pain/stiffness trends.
- Left/right asymmetry.
- Range-of-motion measurements.
- Session consistency.
- Exercise effectiveness.
- Training-context correlations.
- Personal experiments.

### Tab 4 — Plan

- Weekly mobility schedule.
- Calisthenics training split.
- Morning, desk, pre-workout, post-workout, and evening routines.
- Reminder schedule.
- Deep-session scheduling.
- Deload or travel mode.

### Tab 5 — Settings

- Profile and goals.
- Equipment.
- Notification behavior.
- HealthKit permissions.
- Privacy and Face ID lock.
- Data export/import/backup.
- Content and engine version.
- Developer/debug options.

### Full-screen session player

The session player temporarily replaces normal navigation and provides:

- Current exercise.
- Video or animation.
- Reps, hold, tempo, sides, and breathing instructions.
- Progress through the routine.
- Pause, skip, replace, regress, or extend.
- Audio and haptic cues.
- Quick “feels good / neutral / wrong” feedback.
- Live Activity and Apple Watch control later.

---

## 9. Session modes

Restore should support distinct intents rather than pretending every session is the same.

1. **Daily Restore** — general recommendation based on today's state.
2. **Morning Primer** — gentle full-body motion and breathing.
3. **Pre-Workout Prep** — prepares joints and ranges for today's training without fatiguing them.
4. **Post-Workout Reset** — down-regulates and restores heavily trained areas.
5. **Desk Rescue** — two to fifteen minutes for neck, shoulders, thoracic spine, hips, wrists, eyes, and breathing.
6. **Night Downshift** — low-arousal movement and long-exhale breathing.
7. **Targeted Area** — user picks one or more body regions.
8. **Pain-Aware Gentle Mode** — conservative, low-intensity options with stronger stop rules.
9. **Deep Restoration** — 45–90-minute full session.
10. **Travel Mode** — no equipment and small-space movements.
11. **Gym Mode** — permits bands, benches, bars, cable stacks, and floor space.
12. **Assessment Mode** — performs and records standardized measurements.
13. **Skill Prep** — planche, front lever, handstand, pull, push, or leg-specific preparation.
14. **Recovery Day** — longer low-intensity session when no hard training is planned.
15. **Emergency Reset** — one-tap two- or five-minute routine without a full check-in.

---

## 10. Comprehensive feature inventory

The priority labels used below are:

- **P0:** required for the first daily-usable release.
- **P1:** high-value next layer.
- **P2:** advanced differentiation.
- **P3:** experimental or moonshot.

### 10.1 Onboarding and personal baseline

- P0: Goal selection: move better, reduce stiffness, prepare for calisthenics, improve posture, wind down, maintain joints.
- P0: Body-region baseline with front and back body maps.
- P0: Left/right asymmetry baseline.
- P0: Equipment inventory.
- P0: Normal training split and preferred training days.
- P0: Preferred routine durations.
- P0: Notification and desk-reminder preferences.
- P0: Safety explanation and stop-rule acknowledgement.
- P1: Guided baseline range-of-motion assessment.
- P1: “Movements I avoid” and “known sensitive positions.”
- P1: Favorite and disliked drill import.
- P1: Preferred coaching tone and cue density.
- P2: Camera-assisted baseline posture and range capture.
- P2: Adaptive onboarding that skips irrelevant questions.
- P2: Import prior mobility history from JSON/CSV.

### 10.2 Body check-in

- P0: Front/back interactive body map.
- P0: Neck, shoulders, scapulae, chest, elbows, wrists/hands, thoracic spine, lower back, hips, glutes, knees, ankles, feet, hamstrings, quads, calves, and lats.
- P0: Left, right, bilateral, and central selection.
- P0: Separate stiffness, soreness, and discomfort ratings.
- P0: Available-time selector from 2 to 90 minutes.
- P0: Energy/readiness rating.
- P0: Planned or completed workout selection.
- P0: Equipment/location selector.
- P0: Free-text note.
- P1: Symptom quality: tight, dull, sharp, pinchy, unstable, numb/tingly, fatigued, restricted, clicking, or other.
- P1: Onset: today, after training, gradual, recurring, or unknown.
- P1: Movements that trigger or relieve it.
- P1: Voice check-in with structured extraction.
- P1: Compare with yesterday before submitting.
- P1: One-tap presets such as “normal pull-day stiffness.”
- P1: Auto-prefill likely context from calendar and recent history.
- P2: Morning and evening check-ins with separate trends.
- P2: Mood, stress, sleep quality, and perceived recovery.
- P2: Photo or short video note attached to a body region.
- P3: Passive posture-duration signals from device usage where technically and ethically appropriate.

### 10.3 Training context

- P0: Manual training types: pull, push, legs, planche, front lever, handstand, mixed skills, weighted strength, running, rest.
- P0: Mark training as planned, completed, skipped, or changed.
- P0: Rate training stress from easy to very hard.
- P1: Detailed movement exposure: deep shoulder extension, overhead work, wrist-loaded extension, vertical pulling, horizontal pulling, dips, compression, hamstring loading.
- P1: Reusable weekly split.
- P1: Calendar import.
- P1: Quick “I just finished training” workflow.
- P1: Automatically propose a post-workout reset.
- P2: Direct integration with Leverly or another personal workout app.
- P2: Shared local event format between personal apps.
- P2: Infer stressed regions from logged exercises.
- P3: Automatic workout import from HealthKit and supported fitness sources.

### 10.4 Routine-generation engine

- P0: Deterministic local generation.
- P0: Honor exact duration within a small tolerance.
- P0: Respect equipment and environment.
- P0: Prioritize selected body regions.
- P0: Apply contraindications and safety gates.
- P0: Sequence exercises into sensible phases.
- P0: Avoid duplicate movement patterns.
- P0: Include side-specific work when asymmetry is marked.
- P0: Explain why the routine was generated.
- P0: Replace any exercise before or during a session.
- P0: Save the generated routine and engine version.
- P1: Lock chosen exercises and regenerate only the rest.
- P1: Personal effectiveness weighting.
- P1: Familiarity versus novelty control.
- P1: Dose adaptation from prior feedback.
- P1: Fatigue-aware low-readiness routines.
- P1: Prevent overworking the same tissue pattern on consecutive days.
- P1: Calisthenics-specific pre- and post-session logic.
- P1: Routine quality score and validation report in developer mode.
- P1: Manual drag-and-drop editing.
- P1: “More gentle,” “more targeted,” and “more dynamic” regenerate controls.
- P2: Constraint-solver-based routine optimization.
- P2: Automatic N-of-1 testing of two candidate drills.
- P2: Predict likely relief and confidence for each drill.
- P2: Context-sensitive progressions and regressions.
- P2: Personalized recovery debt per region.
- P3: On-device learned recommendation model.

### 10.5 Exercise and protocol library

- P0: Curated exercise database with at least enough coverage for every core body region and session phase.
- P0: Video or animation.
- P0: Written setup, execution, breathing, and common-error cues.
- P0: Reps, holds, tempo, rest, and sides.
- P0: Equipment and space requirements.
- P0: Target regions and intended effects.
- P0: Contraindications and stop conditions.
- P0: Alternatives, regressions, and progressions.
- P0: Search, filtering, favorites, and “avoid.”
- P1: Personal technique notes.
- P1: Effectiveness history on the exercise page.
- P1: “Works best before/after” context.
- P1: Downloadable versus bundled media.
- P1: Custom exercise creation.
- P1: Content versioning and migration.
- P2: Exercise comparison.
- P2: User-recorded demonstration video.
- P2: On-device form cue overlays.
- P3: Automatically generated skeletal animation from motion data.

### 10.6 Guided session player

- P0: Full-screen distraction-free player.
- P0: Timed holds and rep-based movements.
- P0: Left/right sequencing.
- P0: Rest and transition timers.
- P0: Pause, resume, previous, next, skip, and finish.
- P0: Replace or regress an exercise without leaving the player.
- P0: Session progress and remaining time.
- P0: Keep screen awake during a session.
- P0: Audio countdown and haptic cues.
- P0: Per-exercise “good / neutral / wrong” response.
- P1: Voice coaching with selectable cue density.
- P1: Auto-advance.
- P1: AirPods/media remote pause and resume.
- P1: Background audio cues with the screen locked.
- P1: Mirror video for left/right work.
- P1: Landscape or prop-up mode.
- P1: Extend current hold or add a set.
- P1: Quick note by voice.
- P1: Estimated finish time.
- P2: Dynamic Island and Lock Screen Live Activity.
- P2: Apple Watch controls and haptic countdown.
- P2: Adaptive rest based on response.
- P3: Real-time camera rep and angle detection.

### 10.7 Feedback and personalization

- P0: Before-versus-after stiffness and discomfort.
- P0: Overall session usefulness.
- P0: Mark an exercise as helpful, neutral, uncomfortable, or never show again.
- P0: Record skipped or replaced movements.
- P0: Store completion percentage.
- P1: Delayed follow-up later in the day.
- P1: Region-specific relief score.
- P1: Session-too-short/too-long feedback.
- P1: Cue quality feedback.
- P1: Automatic favorite promotion after repeated success.
- P1: Automatic de-prioritization after repeated poor response.
- P1: Contextual effectiveness: for example, useful after planche but not before it.
- P2: Personal response model with confidence intervals.
- P2: Detect habituation or declining benefit.
- P2: Suggest removing drills that add time without measurable value.
- P2: Personal experiments with a hypothesis and outcome.
- P3: Causal-inference-inspired insights, clearly labelled as observational unless evidence supports more.

### 10.8 Plans, scheduling, and routines

- P0: Save any generated routine.
- P0: Pin favorite quick routines.
- P0: Basic weekly schedule.
- P0: Morning, desk, pre-workout, post-workout, and night slots.
- P1: Recurring deep-restoration day.
- P1: Training-day-aware scheduling.
- P1: Deload week mode.
- P1: Travel mode.
- P1: “Minimum viable day” fallback routine.
- P1: Automatically shorten a session when started late.
- P1: Convert one long session into micro-sessions across the day.
- P1: Schedule area-specific maintenance, such as wrists on planche days.
- P2: Calendar conflict awareness.
- P2: Adaptive weekly plan based on adherence and symptoms.
- P2: Seasonal or goal blocks, such as “eight-week thoracic focus.”
- P3: Cross-app scheduling with a wider Personal OS.

### 10.9 Reminders and behavioral support

- P0: Local scheduled reminders.
- P0: Desk-reset interval or selected times.
- P0: Training-linked pre- and post-session reminders.
- P0: Respect quiet hours.
- P0: Snooze, skip today, and reduce frequency.
- P1: Contextual notification text based on the body and plan.
- P1: Smart reminders only when useful—not nagging every missed session.
- P1: Reminder actions that immediately start a routine.
- P1: “You have five minutes before the next calendar event” suggestion.
- P1: End-of-day gentle follow-up for unresolved stiffness.
- P2: Adaptive reminder timing learned from completion behavior.
- P2: Focus-mode-aware reminders.
- P2: Location-triggered desk, home, or gym suggestions through Shortcuts/geofencing where desired.
- P3: Ambient nudges through Watch and compatible devices.

### 10.10 Assessments and measurements

- P1: Guided neck rotation assessment.
- P1: Shoulder flexion assessment.
- P1: Shoulder external/internal rotation assessment.
- P1: Wrist-extension tolerance and range.
- P1: Thoracic rotation.
- P1: Hip internal/external rotation.
- P1: Straight-leg raise or hamstring range.
- P1: Ankle knee-to-wall dorsiflexion.
- P1: Deep-squat comfort and control.
- P1: Left/right comparison.
- P1: Manual angle entry and notes.
- P1: Standardized retest conditions.
- P1: Assessment reminders no more often than useful.
- P2: Camera-assisted angle measurement.
- P2: Overlay current versus previous assessment.
- P2: Confidence and measurement-quality score.
- P2: Mobility capacity profile by joint and plane.
- P2: Trend break detection.
- P3: AR-guided positioning and calibration.

### 10.11 Progress and insights

- P0: Weekly mobility minutes and session count.
- P0: Completion and consistency trend.
- P0: Stiffness/discomfort trend per region.
- P1: Interactive body heatmap by day, week, or month.
- P1: Left/right asymmetry trend.
- P1: Assessment range charts.
- P1: Most and least helpful drills.
- P1: Most common trigger contexts.
- P1: Before/after relief distribution.
- P1: “Areas neglected recently.”
- P1: Recovery versus training-load view.
- P2: Observational correlations with sleep, steps, HRV, resting heart rate, or training type.
- P2: Change-point detection after a new routine or exercise.
- P2: Region-level “maintenance debt” indicator.
- P2: Monthly narrative report.
- P2: Exportable clinician-friendly summary.
- P3: Personal mobility forecast.

### 10.12 Apple Health and recovery context

- P1: Read sleep duration and timing with explicit permission.
- P1: Read steps and activity.
- P1: Read workouts.
- P1: Read resting heart rate and HRV when available.
- P1: Read body mass if desired.
- P1: Use data only as context, never as unquestionable truth.
- P1: Permission-by-permission onboarding.
- P1: Clear “why this permission is useful” explanation.
- P2: Write completed mobility workouts to HealthKit.
- P2: Write mindfulness/breathing sessions where semantically appropriate.
- P2: Recovery score built from transparent components.
- P2: Detect unusually poor recovery and recommend a gentler mode.
- P2: Health-data freshness and source display.
- P3: Watch-based workout and heart-rate session support.

### 10.13 iPhone-native experiences

- P1: Home Screen widget with today's routine.
- P1: Lock Screen widget for a five-minute reset.
- P1: Widget showing unresolved body regions.
- P1: App icon quick actions.
- P1: Siri/App Intent: “Start desk reset.”
- P1: Siri/App Intent: “Log stiff wrists.”
- P1: Shortcuts actions for check-in, routine generation, and session start.
- P1: Action Button shortcut on supported iPhones.
- P2: Live Activity for the current session.
- P2: Dynamic Island timer and next movement.
- P2: StandBy-mode session view.
- P2: Control Center control where supported.
- P2: Interactive widgets for quick logging.
- P2: Handoff/deep links from notifications and widgets.
- P3: Apple Watch companion.
- P3: Watch complication for daily routine or desk-reset status.

### 10.14 AI-assisted features

AI must remain behind the curated exercise library and safety engine.

- P2: Parse “my right shoulder feels pinchy after pull day” into structured check-in fields.
- P2: Conversational check-in.
- P2: Generate plain-language explanations of routine logic.
- P2: Summarize the previous week.
- P2: Answer questions using the user's own logged data.
- P2: Suggest which assessment would reduce uncertainty.
- P2: Convert a mobility article or personal note into a draft protocol for manual review.
- P2: Voice coach with adjustable verbosity.
- P2: Explain observed patterns without overstating causality.
- P2: Create a draft monthly report.
- P3: On-device language model for private note parsing.
- P3: Multimodal analysis of a user-recorded movement.
- P3: Automatically propose safe library additions for human approval.

### 10.15 Camera and computer vision

- P2: Record standardized assessment clips.
- P2: On-device pose landmarks.
- P2: Joint-angle measurement.
- P2: Left/right side-by-side comparison.
- P2: Ghost overlay against the user's previous best position.
- P2: Automatic clip trimming.
- P2: Privacy-first local processing.
- P2: Manual correction of detected landmarks.
- P3: Real-time range target overlay.
- P3: Rep counting for controlled mobility drills.
- P3: Form drift detection.
- P3: Posture-duration snapshots, explicitly not presented as a medical diagnosis.

### 10.16 Data, privacy, security, and portability

- P0: Full offline operation.
- P0: SQLite persistence with migrations.
- P0: Automatic local backup snapshot before migrations.
- P0: JSON export and import.
- P0: CSV export for check-ins, sessions, and assessments.
- P0: Delete all data.
- P0: No analytics SDK by default.
- P1: Face ID app lock.
- P1: Encrypted sensitive local values.
- P1: Optional encrypted database build.
- P1: iCloud Drive backup/export.
- P1: Redacted diagnostic bundle.
- P1: Audit log for imports, migrations, and sync.
- P2: End-to-end encrypted multi-device sync.
- P2: Selective sync by data category.
- P2: Local-only mode that permanently disables remote features.
- P2: Signed content packs.
- P3: Self-hosted sync server.

### 10.17 Developer and content-authoring tools

- P0: Seed-data importer.
- P0: Database inspector in development builds.
- P0: Engine-debug screen showing scores and rejected candidates.
- P0: Feature flags.
- P0: Structured logging.
- P0: Reproducible generation using stored engine version and random seed.
- P1: Exercise editor in a hidden developer screen.
- P1: Content validation command.
- P1: Routine simulation across thousands of synthetic check-ins.
- P1: Constraint-violation report.
- P1: Migration dry run.
- P1: Export a bug report with state but no sensitive notes by default.
- P1: Preview notification schedules.
- P1: Time-travel clock for testing reminders.
- P2: Web-based content console backed by Laravel.
- P2: Remote feature flags and signed content updates.
- P2: Personal analytics notebook export.

---

## 11. User-story backlog

### Epic A — Onboarding and profile

| ID | Priority | User story | Acceptance criteria |
|---|---:|---|---|
| ONB-001 | P0 | As the user, I can complete a short onboarding so the first routine is relevant. | Completion is possible in under five minutes; all non-safety fields can be skipped; profile is stored locally. |
| ONB-002 | P0 | As the user, I can select mobility goals. | Multiple goals can be selected and reordered; goals affect generator weights. |
| ONB-003 | P0 | As the user, I can mark my commonly stiff or sensitive regions. | Front/back and left/right are supported; saved values appear in the initial body profile. |
| ONB-004 | P0 | As the user, I can register available equipment. | Generator never selects unavailable equipment unless the user changes context. |
| ONB-005 | P0 | As the user, I can enter my normal calisthenics split. | Push, pull, legs, planche, front lever, handstand, mixed skills, and rest are supported. |
| ONB-006 | P0 | As the user, I can choose preferred routine lengths. | Default quick, normal, and deep durations are used on Today. |
| ONB-007 | P0 | As the user, I see clear safety boundaries before using generated routines. | The app explains stop rules and records acknowledgement without hiding access behind legalistic text. |
| ONB-008 | P1 | As the user, I can complete optional baseline assessments. | Results are timestamped, side-specific, and can be skipped. |
| ONB-009 | P1 | As the user, I can choose coaching style. | Silent, minimal, normal, and detailed cue modes are available. |
| ONB-010 | P1 | As the user, I can revise onboarding answers later. | All values are editable; changes are versioned where they affect historical interpretation. |

### Epic B — Daily check-in

| ID | Priority | User story | Acceptance criteria |
|---|---:|---|---|
| CHK-001 | P0 | As the user, I can complete a quick check-in in under 30 seconds. | Body, time, readiness, and training context can be logged from one screen. |
| CHK-002 | P0 | As the user, I can tap body regions on front and back diagrams. | Each selected region visibly changes state and supports side selection. |
| CHK-003 | P0 | As the user, I can rate stiffness, soreness, and discomfort separately. | Each dimension uses a consistent scale and is optional. |
| CHK-004 | P0 | As the user, I can choose how much time I have. | Values from 2–90 minutes are supported; recent values appear as shortcuts. |
| CHK-005 | P0 | As the user, I can state what I trained or will train. | Planned and completed context are stored separately. |
| CHK-006 | P0 | As the user, I can choose my current environment and equipment. | Home, desk, gym, travel, and custom presets are supported. |
| CHK-007 | P0 | As the user, I can add a free-text note. | Note is optional, editable, and local-only by default. |
| CHK-008 | P0 | As the user, I am stopped from normal generation when I report a red-flag pattern. | The safety gate produces a conservative message and does not generate an aggressive routine. |
| CHK-009 | P1 | As the user, I can describe symptom quality and onset. | Structured options and “other” are available; sharp, radiating, numb/tingly, or unstable responses trigger stronger checks. |
| CHK-010 | P1 | As the user, I can save a common check-in preset. | Presets can prefill but never silently submit. |
| CHK-011 | P1 | As the user, I can compare today with the previous check-in. | Changed regions and ratings are clearly shown. |
| CHK-012 | P1 | As the user, I can dictate a note. | Speech becomes text; structured interpretation requires confirmation. |
| CHK-013 | P1 | As the user, I can indicate movements that worsen or improve a region. | The movement tags influence candidate filtering and future insights. |
| CHK-014 | P2 | As the user, I can attach a short video to a region. | Media remains local unless explicitly exported; storage usage is visible. |

### Epic C — Routine generation

| ID | Priority | User story | Acceptance criteria |
|---|---:|---|---|
| GEN-001 | P0 | As the user, I receive a complete routine from my check-in. | Generation succeeds offline and returns a validated sequence or a clear safe fallback. |
| GEN-002 | P0 | As the user, my routine fits the available time. | Estimated duration remains within the configured tolerance. |
| GEN-003 | P0 | As the user, exercises match available equipment and space. | Incompatible exercises are absent. |
| GEN-004 | P0 | As the user, selected body regions receive appropriate attention. | Every high-priority region is addressed or the app explains why it was omitted. |
| GEN-005 | P0 | As the user, the routine accounts for planned or completed training. | Pre-workout routines avoid fatiguing work; post-workout routines address relevant exposure. |
| GEN-006 | P0 | As the user, I see why each drill was selected. | Every item has a concise reason linked to check-in or plan data. |
| GEN-007 | P0 | As the user, I can replace a drill. | Replacement satisfies the same constraints and records the reason when supplied. |
| GEN-008 | P0 | As the user, I can regenerate the routine. | The new result is validated and history preserves the previous version. |
| GEN-009 | P0 | As the user, unsafe or contraindicated drills are excluded. | Hard constraints are unit-tested and cannot be overridden by recommendation score. |
| GEN-010 | P0 | As the developer, I can reproduce any generated routine. | Check-in snapshot, engine version, content version, and seed are stored. |
| GEN-011 | P1 | As the user, I can lock exercises and regenerate the remainder. | Locked items retain order unless the resulting sequence is invalid, in which case the app explains the conflict. |
| GEN-012 | P1 | As the user, I can request a gentler, more dynamic, or more targeted variant. | The chosen modifier changes scoring and dosage predictably. |
| GEN-013 | P1 | As the user, the app uses my prior exercise response. | Helpful exercises receive a bounded boost; poor responses receive a penalty or exclusion. |
| GEN-014 | P1 | As the user, the app avoids monotonous repetition. | Novelty is introduced without displacing repeatedly effective essentials. |
| GEN-015 | P1 | As the user, low readiness produces a lower-load session. | Intensity, complexity, and duration recommendations are reduced according to transparent rules. |
| GEN-016 | P1 | As the user, side-specific symptoms produce appropriate unilateral work. | Affected side, unaffected side, and symmetry work follow exercise metadata and protocol rules. |
| GEN-017 | P1 | As the developer, I can inspect candidate scores and rejection reasons. | Debug mode lists candidates, scores, hard-filter failures, and final sequencing decisions. |
| GEN-018 | P2 | As the user, Restore learns which drill combinations work best. | Combination effects are introduced only after sufficient data and show confidence. |
| GEN-019 | P2 | As the user, Restore can divide a long plan across the day. | The resulting micro-sessions preserve required sequencing and total dose. |
| GEN-020 | P3 | As the user, an on-device model can rank safe candidates. | Model output remains subordinate to deterministic filters and can be disabled. |

### Epic D — Exercise library

| ID | Priority | User story | Acceptance criteria |
|---|---:|---|---|
| LIB-001 | P0 | As the user, I can browse a curated movement library. | Search and region, intent, equipment, and difficulty filters work offline. |
| LIB-002 | P0 | As the user, I can understand how to perform a drill. | Each active drill has setup, execution, breathing, dosage, common errors, and stop rules. |
| LIB-003 | P0 | As the generator, I can reason about every drill. | Every drill has machine-readable region effects, phase, equipment, intensity, and contraindication metadata. |
| LIB-004 | P0 | As the user, I can favorite or avoid a drill. | Favorites influence ranking; avoided drills never appear unless manually re-enabled. |
| LIB-005 | P0 | As the user, I can view regressions and alternatives. | Alternatives preserve purpose and make equipment differences clear. |
| LIB-006 | P1 | As the user, I can add personal cues. | Notes are searchable and appear in the player. |
| LIB-007 | P1 | As the user, I can see personal effectiveness by context. | Exercise page shows attempts, completion, immediate response, and relevant context. |
| LIB-008 | P1 | As the user, I can create a custom exercise. | Required safety and generator metadata must be completed before automatic selection is allowed. |
| LIB-009 | P1 | As the developer, I can validate all content. | CI fails for missing required fields, broken references, impossible dosage, or invalid alternatives. |
| LIB-010 | P2 | As the user, I can record my own demonstration. | Video can replace the default locally and can be removed independently. |

### Epic E — Session player

| ID | Priority | User story | Acceptance criteria |
|---|---:|---|---|
| SES-001 | P0 | As the user, I can follow a routine without handling the phone constantly. | Auto-advance, large controls, audio, and haptics support hands-free flow. |
| SES-002 | P0 | As the user, I can perform timed, rep-based, and side-based steps. | Timer and progress behavior matches the exercise prescription. |
| SES-003 | P0 | As the user, I can pause, skip, go back, or finish early. | Session state persists if the app backgrounds or restarts unexpectedly. |
| SES-004 | P0 | As the user, I can replace or regress a movement mid-session. | Replacement is valid for remaining time and does not corrupt logs. |
| SES-005 | P0 | As the user, I can quickly mark how a movement felt. | Feedback requires one tap and does not interrupt flow. |
| SES-006 | P0 | As the user, the screen remains usable from a mat or floor. | Controls meet large-target and contrast requirements; landscape is not required for P0. |
| SES-007 | P0 | As the user, I see elapsed and remaining session time. | Estimates update after skips, additions, or extensions. |
| SES-008 | P1 | As the user, I can use voice cues with minimal or detailed coaching. | Cue mode can be changed during a session. |
| SES-009 | P1 | As the user, I can lock the phone and still hear cues. | Supported session audio remains functional under configured background mode. |
| SES-010 | P1 | As the user, I can extend a useful drill. | Added dose is bounded by exercise safety metadata. |
| SES-011 | P1 | As the user, I can add a voice note without stopping the session. | Note is attached to the correct routine item and timestamp. |
| SES-012 | P2 | As the user, I can control the session from the Lock Screen or Dynamic Island. | Live Activity shows current step, countdown, and pause/next controls where supported. |
| SES-013 | P2 | As the user, I can control the session from Apple Watch. | Watch and phone state stay synchronized across pause, skip, and completion. |
| SES-014 | P3 | As the user, the camera can count controlled reps. | Counting is optional, processed locally, and exposes confidence. |

### Epic F — Feedback and learning

| ID | Priority | User story | Acceptance criteria |
|---|---:|---|---|
| FDB-001 | P0 | As the user, I can compare body ratings before and after a session. | Relevant regions are prefilled and can be adjusted. |
| FDB-002 | P0 | As the user, I can rate overall usefulness. | Rating is stored with routine and context snapshots. |
| FDB-003 | P0 | As the user, I can permanently hide a movement that felt wrong. | The movement is excluded immediately and can be restored in settings. |
| FDB-004 | P0 | As the engine, I learn from completion and replacement behavior. | Behavior affects bounded ranking values and remains inspectable. |
| FDB-005 | P1 | As the user, I receive an optional later follow-up. | Reminder timing is configurable and skipped when no useful question remains. |
| FDB-006 | P1 | As the user, I can see which movements repeatedly help each region. | Insight requires a minimum sample and displays sample size. |
| FDB-007 | P1 | As the user, I can state that a session was too intense or too easy. | Future dosage adapts within allowed bounds. |
| FDB-008 | P2 | As the user, I can run a personal experiment. | A hypothesis, intervention, comparison, outcome, and stop condition are recorded. |
| FDB-009 | P2 | As the user, I can see uncertainty rather than false certainty. | Predictions and insights display confidence or “not enough data.” |

### Epic G — Scheduling and reminders

| ID | Priority | User story | Acceptance criteria |
|---|---:|---|---|
| PLN-001 | P0 | As the user, I can save and schedule routines. | Saved routines can recur on selected days and times. |
| PLN-002 | P0 | As the user, I can receive desk-reset reminders. | Quiet hours, weekdays, interval, and maximum daily reminders are configurable. |
| PLN-003 | P0 | As the user, I can snooze or skip from a notification. | Actions update the schedule and history correctly. |
| PLN-004 | P0 | As the user, I can launch a routine directly from a notification. | Deep link opens the intended routine or safe regenerated equivalent. |
| PLN-005 | P1 | As the user, reminders account for my training plan. | Pre/post prompts follow planned time and can be dismissed for the day. |
| PLN-006 | P1 | As the user, a late start can create a shorter valid routine. | Shortening re-runs generation rather than blindly cutting the end. |
| PLN-007 | P1 | As the user, I can schedule one deep session and multiple micro-sessions. | Weekly plan visualizes total load and target-region coverage. |
| PLN-008 | P1 | As the user, I can enable travel or deload mode. | Plans and notifications adjust without deleting normal settings. |
| PLN-009 | P2 | As the user, reminder timing adapts to when I actually complete sessions. | Adaptation is bounded and can be reset. |
| PLN-010 | P2 | As the user, calendar gaps can suggest a fitting routine. | Calendar data is read-only; suggestions respect a minimum buffer and can be disabled. |

### Epic H — Assessments and progress

| ID | Priority | User story | Acceptance criteria |
|---|---:|---|---|
| ASM-001 | P1 | As the user, I can run standardized range assessments. | Instructions, setup, side, units, and retest conditions are stored. |
| ASM-002 | P1 | As the user, I can manually record an angle or distance. | Values validate against plausible ranges without blocking an override note. |
| ASM-003 | P1 | As the user, I can compare left and right. | Difference and trend are shown without labelling a diagnosis. |
| ASM-004 | P1 | As the user, I am reminded to retest at sensible intervals. | No daily nagging; interval varies by assessment type. |
| ASM-005 | P2 | As the user, the camera can estimate an angle. | User confirms landmarks and result; raw video can be deleted independently. |
| PRO-001 | P0 | As the user, I can see consistency and mobility minutes. | Day, week, month, and rolling views are available. |
| PRO-002 | P0 | As the user, I can see region ratings over time. | Missing data is distinct from zero symptoms. |
| PRO-003 | P1 | As the user, I can view a body heatmap over a selected period. | Heatmap supports front/back, side, and metric selection. |
| PRO-004 | P1 | As the user, I can see the most effective and least useful drills. | Ranking accounts for sample size and context. |
| PRO-005 | P1 | As the user, I can inspect the data behind an insight. | Every insight links to source sessions and explains calculation. |
| PRO-006 | P2 | As the user, I can see observational relationships with sleep or training. | UI explicitly avoids causal language and shows sample count. |
| PRO-007 | P2 | As the user, I can export a concise report. | Report includes selected period, charts/data, notes, and privacy controls. |

### Epic I — Apple platform integrations

| ID | Priority | User story | Acceptance criteria |
|---|---:|---|---|
| APL-001 | P1 | As the user, I can grant HealthKit permissions individually. | The app requests only data used by an enabled feature and explains each purpose. |
| APL-002 | P1 | As the user, sleep, steps, workouts, HRV, and resting heart rate can inform readiness. | Stale or missing data is labelled; manual input remains available. |
| APL-003 | P2 | As the user, completed mobility can be written to HealthKit. | Writes require explicit permission and accurately represent duration/type. |
| APL-004 | P1 | As the user, I can start common routines with Siri or Shortcuts. | Intents support desk reset, target region, and saved routine. |
| APL-005 | P1 | As the user, a widget can start today's routine. | Widget state reflects current plan and deep-links correctly. |
| APL-006 | P2 | As the user, the current session appears as a Live Activity. | It ends reliably on completion or cancellation and recovers from app relaunch. |
| APL-007 | P2 | As the user, the Action Button can start an emergency reset through a Shortcut. | Setup instructions are provided and action opens directly to the player. |
| APL-008 | P3 | As the user, Apple Watch provides controls and haptics. | Watch app remains useful without duplicating the full phone interface. |

### Epic J — Privacy, data, and reliability

| ID | Priority | User story | Acceptance criteria |
|---|---:|---|---|
| DAT-001 | P0 | As the user, Restore works without an account or network. | Core loop and all P0 content function in airplane mode. |
| DAT-002 | P0 | As the user, I can export all app data. | Export is versioned, documented, and re-importable. |
| DAT-003 | P0 | As the user, I can delete all data. | Deletion covers database, media, cache, and pending notifications after confirmation. |
| DAT-004 | P0 | As the developer, schema migrations cannot silently lose data. | Migration tests use fixtures from every previous released schema. |
| DAT-005 | P1 | As the user, I can protect the app with Face ID. | App locks after configured timeout and has a safe fallback. |
| DAT-006 | P1 | As the user, I can create an encrypted backup. | Backup requires a user-controlled secret and verifies integrity before replacing data. |
| DAT-007 | P1 | As the developer, I can obtain a redacted diagnostic bundle. | Sensitive notes, health values, and media are excluded unless explicitly selected. |
| DAT-008 | P2 | As the user, I can sync across devices without surrendering privacy. | Sync is encrypted, conflict-aware, optional, and can be permanently disabled. |

### Epic K — AI and camera intelligence

| ID | Priority | User story | Acceptance criteria |
|---|---:|---|---|
| AI-001 | P2 | As the user, I can describe how I feel naturally. | Parsed fields are shown for confirmation before they affect generation. |
| AI-002 | P2 | As the user, I can ask what has helped my wrists recently. | Answer is grounded exclusively in stored personal data and cites underlying sessions in-app. |
| AI-003 | P2 | As the user, I receive a readable weekly summary. | Summary distinguishes recorded facts, computed trends, and suggestions. |
| AI-004 | P2 | As the user, AI can explain but cannot invent an unsafe routine. | AI only chooses or discusses approved content; deterministic safety validation is mandatory. |
| CAM-001 | P2 | As the user, I can measure selected ranges with the camera. | Processing is local by default and confidence is displayed. |
| CAM-002 | P2 | As the user, I can compare current and previous clips. | Playback is synchronized and supports overlay or side-by-side display. |
| CAM-003 | P3 | As the user, I can receive real-time movement cues. | Feature is labelled experimental and never claims medical assessment. |

### Epic L — Developer experience

| ID | Priority | User story | Acceptance criteria |
|---|---:|---|---|
| DEV-001 | P0 | As the developer, a fresh clone can run with documented commands. | Setup is automated, secrets are absent from Git, and validation runs in one command. |
| DEV-002 | P0 | As the developer, architecture rules are recorded for Codex. | `AGENTS.md` and ADRs define boundaries, naming, testing, and dependency policy. |
| DEV-003 | P0 | As the developer, every engine change is regression tested. | Golden fixtures and invariant tests run in CI. |
| DEV-004 | P0 | As the developer, database schema and content changes are reviewable. | Generated migrations and content diffs are committed separately. |
| DEV-005 | P1 | As the developer, I can simulate many user states. | Scenario generator covers body regions, durations, equipment, and safety cases. |
| DEV-006 | P1 | As the developer, I can inspect a routine decision. | Debug trace is human-readable and exportable. |
| DEV-007 | P1 | As the developer, release builds are reproducible. | Version, build number, runtime version, content version, and Git commit are visible. |
| DEV-008 | P1 | As the developer, failed over-the-air updates can be rolled back. | Preview testing and documented rollback precede production promotion. |

---

## 12. Safety model

Restore should be cautious without becoming unusable. The safety model has four layers.

### Layer 1 — Input safety gate

Certain responses should block or strongly limit normal automatic routines, including reports such as:

- Sudden severe pain.
- Recent major trauma.
- New numbness or tingling.
- Unexplained weakness or loss of control.
- Radiating symptoms.
- Significant swelling or deformity.
- Dizziness, fainting, chest symptoms, or breathing difficulty.
- A rapidly worsening problem.

The app should not diagnose the cause. It should say that the input is outside the intended self-guided mobility scope, advise stopping aggravating movement, and encourage appropriate professional or urgent evaluation based on severity.

### Layer 2 — Exercise contraindications

Every exercise has machine-readable exclusions and cautions. Example dimensions:

- Region and side.
- Symptom quality.
- Pain threshold.
- Recent trauma.
- Required weight bearing.
- End-range loading.
- Balance requirement.
- Neck position.
- Wrist-extension demand.
- Shoulder-extension demand.
- Spinal flexion/extension demand.
- Equipment stability.

### Layer 3 — Dosage limits

Each exercise defines:

- Minimum and maximum duration or reps.
- Maximum sets in a routine.
- Maximum weekly exposure when relevant.
- Allowed progression step.
- Intensity ceiling by session mode.
- Whether longer is actually better.

### Layer 4 — In-session stop rules

The player always exposes a prominent “this feels wrong” action. A wrong response can:

- Stop the current drill.
- Suggest a safe regression or skip.
- Add the drill to a temporary avoid list.
- Prompt a minimal region reassessment.
- End the routine when the report crosses a safety threshold.

### Non-negotiable generator invariant

> Recommendation score may rank safe candidates, but it can never override a hard safety or compatibility filter.

---

## 13. Routine-engine design

### 13.1 Inputs

- Daily check-in.
- Body-region ratings and side.
- Session intent.
- Planned/completed training.
- Recent regional exposure.
- Available time.
- Equipment and environment.
- User goals.
- Favorite/avoided exercises.
- Exercise history and response.
- Assessment limitations.
- Optional recovery data.
- Safety state.

### 13.2 Output

A generated routine should contain:

- Routine ID and generation timestamp.
- Engine, rules, and content versions.
- Input snapshot.
- Generation seed.
- Session mode.
- Estimated duration.
- Selected target regions and goals.
- Ordered phases.
- Exercises with exact dosage, side, rest, and cues.
- Selection explanation per exercise.
- Alternatives.
- Validation results.

### 13.3 Target-priority vector

For each region and movement goal, compute a bounded priority from factors such as:

```text
priority =
  current stiffness weight
+ current discomfort weight
+ chronic-goal weight
+ relevant training-exposure weight
+ time-since-maintenance weight
+ asymmetry weight
- recent mobility-dose penalty
- acute-irritability penalty
- contraindication penalty
```

The exact values should be configuration data, not scattered magic numbers.

### 13.4 Candidate filtering

Before scoring, remove exercises that fail any hard constraint:

- Missing equipment.
- Insufficient space.
- Wrong session mode.
- Contraindicated symptom or position.
- User avoidance.
- Incompatible side.
- Exceeds intensity ceiling.
- Exceeds available time.
- Content disabled or incomplete.

### 13.5 Candidate scoring

A first explainable score can be:

```text
score =
  target-region fit
+ intent fit
+ training-context fit
+ phase need
+ personal effectiveness
+ favorite bonus
+ appropriate novelty
+ underused-pattern bonus
- redundancy
- fatigue cost
- setup cost
- recent overexposure
- poor-response penalty
```

All terms should be included in a debug trace.

### 13.6 Phase sequencing

Default sequence:

1. Arrival and down-regulation.
2. Gentle global motion or controlled joint exploration.
3. Targeted mobility or range exposure.
4. Low-load control/stability in the newly accessed range.
5. Integrated movement pattern.
6. Downshift or final reassessment.

Not every two- or five-minute session needs every phase. Templates define required and optional phases by duration and mode.

### 13.7 Duration budgeting

Example budget logic:

| Available time | Typical structure |
|---:|---|
| 2 min | One highly targeted reset or breathing/movement pair. |
| 5 min | Arrival + two targeted items + quick reassessment. |
| 10 min | Arrival + three to four targeted items + control/integration. |
| 15–20 min | Full compact sequence across one to three priorities. |
| 30 min | Broader region coverage and more controlled-range work. |
| 45–60 min | Full restoration session with deeper targeted blocks. |
| 75–90 min | Assessment or deep session with multiple regions and longer transitions. |

### 13.8 Personalization stages

1. **Rules only:** use profile, check-in, and fixed metadata.
2. **Preference learning:** favorites, avoids, skips, replacements.
3. **Response learning:** immediate and delayed outcome per drill/context.
4. **Combination learning:** useful sequences and pairings.
5. **Prediction:** estimate response with uncertainty.
6. **Personal experiments:** deliberately compare alternatives.

Do not jump directly to machine learning. The app should earn enough clean data first.

### 13.9 Required engine tests

- Never selects unavailable equipment.
- Never selects explicitly avoided exercise.
- Never selects contraindicated exercise.
- Fits duration tolerance.
- Includes a valid phase sequence.
- Does not duplicate the same movement pattern beyond configured limits.
- Handles zero selected regions.
- Handles every region selected.
- Handles two-minute and ninety-minute durations.
- Handles no history and extensive history.
- Handles migration from old content versions.
- Reproduces a routine from stored seed/version.
- Produces a safe fallback if no ideal candidate exists.
- Does not return an empty routine without an explicit reason.

---

## 14. Initial content taxonomy

### Body regions

- Head/jaw/eyes.
- Cervical spine/neck.
- Upper trapezius.
- Shoulder joint: front, side, rear.
- Scapular region.
- Chest/pecs.
- Lats.
- Elbows/forearms.
- Wrists/hands/fingers.
- Thoracic spine.
- Lumbar spine/lower back.
- Pelvis/SI-area label without diagnostic claims.
- Hips: front, side, deep rotation.
- Glutes.
- Adductors/groin.
- Hamstrings.
- Quadriceps.
- Knees.
- Calves.
- Ankles.
- Feet/toes.

### Intended effects

- Down-regulate.
- Breathe/expand.
- Decompress.
- Mobilize.
- Explore range.
- Improve tolerance.
- Activate lightly.
- Stabilize/control.
- Integrate.
- Prepare for load.
- Recover after load.
- Reassess.

### Movement-pattern tags

- Flexion/extension.
- Rotation.
- Lateral flexion.
- Abduction/adduction.
- Internal/external rotation.
- Protraction/retraction.
- Elevation/depression.
- Pronation/supination.
- Wrist flexion/extension/deviation.
- Ankle dorsiflexion/plantarflexion.
- Segmental spinal movement.
- Overhead position.
- Shoulder extension.
- Straight-arm scapular position.
- Compression.
- Squat pattern.
- Hinge pattern.

### Session-phase tags

- Arrival.
- Warm motion.
- Targeted mobility.
- Controlled range.
- Integration.
- Cooldown.
- Reassessment.

---

## 15. Suggested initial exercise-library coverage

The first release does not need hundreds of exercises. It needs a small, excellent, fully tagged set with multiple options for each common context.

A sensible P0 target is approximately **45–60 curated movements**, distributed across:

- Neck and eye/jaw resets.
- Scapular and shoulder control.
- Thoracic rotation and extension.
- Chest and lat mobility.
- Elbow, forearm, wrist, hand, and finger preparation.
- Hip rotation and hip-flexor/adductor mobility.
- Hamstring and posterior-chain range work.
- Ankle and foot mobility.
- Gentle segmental spinal motion.
- Breathing and rib-cage expansion.
- Integrated full-body movement.
- Low-load trunk and joint-control exercises.

Each body region needs:

- At least one gentle option.
- At least one targeted option.
- At least one control/stability option.
- At least one no-equipment alternative.
- A safe replacement path.

The content should be reviewed as carefully as application code. A larger unstructured library would make the generator worse, not better.

---

## 16. Data model

The exact schema can evolve, but the domain should separate historical facts from mutable preferences.

### Core tables

#### `user_profile`

- ID.
- Goals.
- Preferred durations.
- Coaching preferences.
- Units.
- Created/updated timestamps.

#### `equipment`

- ID, slug, name, category.

#### `user_equipment`

- Equipment ID.
- Availability by context.
- Notes.

#### `body_regions`

- ID, slug, display name.
- Parent region.
- Front/back/central.
- Left/right applicability.
- Body-map geometry key.

#### `check_ins`

- ID and timestamp.
- Session intent.
- Available minutes.
- Energy/readiness/stress/sleep quality.
- Environment.
- Planned and completed training references.
- Free-text note.
- Safety status.

#### `check_in_regions`

- Check-in ID.
- Region ID.
- Side.
- Stiffness, soreness, discomfort.
- Symptom quality.
- Onset.
- Trigger and relief tags.

#### `training_sessions`

- ID, date, type, planned/completed.
- Stress rating.
- Exercise-exposure tags.
- Source: manual, HealthKit, Leverly, calendar.

#### `exercises`

- ID, slug, name, version, active flag.
- Description and cues.
- Media references.
- Prescription type.
- Default/min/max dosage.
- Difficulty and intensity.
- Bilateral/unilateral rules.
- Space and setup cost.

#### `exercise_effects`

- Exercise ID.
- Region ID.
- Intended effect.
- Magnitude.
- Movement plane.

#### `exercise_requirements`

- Equipment.
- Environment.
- Position.
- Space.

#### `exercise_contraindications`

- Symptom/region/side rule.
- Threshold.
- Hard exclusion or caution.
- User-facing explanation.

#### `exercise_relations`

- Alternative.
- Regression.
- Progression.
- Prerequisite.
- Pairing.

#### `routine_templates`

- Mode.
- Duration range.
- Required and optional phases.
- Phase budgets.
- Intensity ceiling.

#### `generated_routines`

- Input snapshot.
- Template ID.
- Engine version.
- Content version.
- Seed.
- Explanation.
- Validation state.

#### `routine_items`

- Routine ID and order.
- Exercise version.
- Exact dosage.
- Side.
- Selection reason.
- Replacement lineage.

#### `session_logs`

- Routine ID.
- Started/completed timestamps.
- Status.
- Actual duration.
- Completion percent.
- Background interruptions.

#### `session_item_logs`

- Routine item ID.
- Actual dose.
- Completed/skipped/replaced.
- Immediate response.
- Note.

#### `session_outcomes`

- Before and after region values.
- Overall usefulness.
- Intensity fit.
- Delayed outcome.

#### `exercise_preferences`

- Favorite/avoid.
- Familiarity.
- Personal cues.
- Manual priority.

#### `exercise_response_stats`

- Exercise, region, context.
- Attempts.
- Mean response.
- Uncertainty.
- Last updated.

#### `assessments`

- Assessment definition and version.
- Setup, units, side rules.

#### `assessment_results`

- Assessment, side, value, confidence.
- Manual/camera source.
- Notes and media reference.

#### `plans` and `plan_slots`

- Recurrence.
- Time window.
- Mode/template.
- Training relationship.

#### `notification_preferences` and `scheduled_notifications`

- Rule, quiet hours, snooze state, deep-link payload.

#### `app_events`

- Local diagnostic events only.
- Redaction category.
- Retention limit.

#### `schema_metadata`

- Schema version.
- Content version.
- Last successful backup and migration.

### Historical integrity rule

A completed routine should continue to reference the exact exercise/content version used at the time. Editing today's exercise definition must not silently rewrite old session history.

---

## 17. Recommended technical architecture

### 17.1 Initial architecture decision

Build the first version as a **single Expo/React Native TypeScript repository with a local database and no backend**.

Do not begin with Laravel merely because it may be useful later. Add a backend only when a concrete feature requires server-side behavior, such as multi-device sync, remote content management, or secure AI-provider access.

### 17.2 Recommended mobile stack

- Expo with the current stable SDK pinned in the repository.
- React Native and TypeScript in strict mode.
- Expo Router for file-based navigation and deep links.
- `expo-sqlite` as the local source of truth.
- Drizzle ORM or a similarly typed migration layer over SQLite.
- Zod for runtime validation and import/content schemas.
- Zustand for short-lived UI/session state; persistent domain facts remain in SQLite.
- React Hook Form for forms where useful.
- React Native Reanimated and Gesture Handler for polished interaction.
- `react-native-svg` for the interactive body map.
- Expo Notifications for local reminders.
- Expo Haptics.
- Expo Video/Audio modules for exercise media and coaching cues.
- Expo SecureStore for secrets and small sensitive values.
- Expo Local Authentication for Face ID later.
- Jest with `jest-expo` and React Native Testing Library.
- Maestro or another reliable device-level E2E tool.
- EAS Build, EAS Update, and EAS Submit.

### 17.3 State ownership

- **SQLite:** profile, check-ins, content, generated routines, sessions, outcomes, plans, assessments.
- **Zustand:** current unsaved check-in, active-player state, transient UI, debug overlays.
- **SecureStore:** encryption keys, optional API token, authentication preference.
- **Files:** local videos, assessment media, exports, and backups.
- **EAS/remote services:** binaries and compatible over-the-air JS/asset updates—not personal health data.

### 17.4 Suggested repository structure

```text
restore/
├── app/                         # Expo Router routes only
│   ├── (tabs)/
│   │   ├── index.tsx            # Today
│   │   ├── library.tsx
│   │   ├── progress.tsx
│   │   ├── plan.tsx
│   │   └── settings.tsx
│   ├── check-in/
│   ├── routine/
│   ├── session/
│   ├── assessment/
│   └── _layout.tsx
├── src/
│   ├── components/
│   ├── design-system/
│   ├── features/
│   │   ├── onboarding/
│   │   ├── check-in/
│   │   ├── body-map/
│   │   ├── exercises/
│   │   ├── generator/
│   │   ├── session-player/
│   │   ├── feedback/
│   │   ├── plans/
│   │   ├── notifications/
│   │   ├── assessments/
│   │   └── progress/
│   ├── domain/                  # Pure types, rules, invariants
│   ├── db/
│   │   ├── schema/
│   │   ├── migrations/
│   │   ├── repositories/
│   │   └── seeds/
│   ├── engine/                  # Pure routine-generation package
│   ├── services/                # HealthKit, files, notifications, updates
│   ├── content/                 # Versioned exercise/protocol source data
│   ├── hooks/
│   ├── utils/
│   └── test-fixtures/
├── assets/
│   ├── exercises/
│   ├── audio/
│   ├── body-map/
│   └── branding/
├── docs/
│   ├── product/
│   ├── architecture/
│   ├── safety/
│   ├── content/
│   └── releases/
├── scripts/
│   ├── validate-content.ts
│   ├── seed-db.ts
│   ├── simulate-generator.ts
│   └── export-schema.ts
├── AGENTS.md
├── app.config.ts
├── eas.json
└── package.json
```

### 17.5 Architectural boundaries

- UI may call application services, not raw SQL.
- The generator is a pure domain module: input in, result or validation failure out.
- Generator code must not depend on React Native.
- Content is schema-validated before entering the database.
- Historical records are immutable except for explicit correction flows.
- Platform integrations sit behind interfaces so tests can use fakes.
- AI never writes directly to the database or generator output; it creates a draft that passes validation and requires confirmation where appropriate.

---

## 18. Optional Laravel backend—only when justified

Add Laravel later when at least one of these is being built:

- Multi-device synchronization.
- Web-based content editing.
- Remote signed content packs.
- Secure proxy for an AI provider.
- Off-device encrypted backups.
- Shared data with Leverly or a Personal OS.
- Heavy analytics that are impractical on-device.

### Possible future repository promotion

```text
restore/
├── apps/
│   ├── mobile/                  # Existing Expo app
│   └── api/                     # Laravel API
├── packages/
│   ├── contracts/               # Generated OpenAPI/JSON schemas
│   └── content-source/
└── docs/
```

### Possible API responsibilities

- Authentication for one owner/device set.
- Append-only sync batches.
- Conflict resolution and tombstones.
- Exercise and protocol versions.
- Signed content manifests.
- Encrypted backup blobs.
- AI request proxy with strict data minimization.
- Cross-app training-context events.

### What the API should not do initially

- Generate every routine remotely.
- Become required for opening or using the app.
- Store unencrypted personal notes by default.
- Turn a single-user app into premature multi-tenant infrastructure.

---

## 19. UX and visual direction

### Design character

- Calm, precise, athletic, and premium.
- Native iOS visual language rather than a web dashboard squeezed onto a phone.
- Large typography and controls for floor use.
- Sparse home screen with progressive disclosure.
- Clear body-map heat visualization.
- Motion that explains state changes rather than decorative animation everywhere.
- Dark and light modes from day one.

### Today screen concept

```text
Good afternoon

[ Body status card / small heatmap ]
Neck 4 · Right wrist 5 · Thoracic 3

What does your body need today?
[ Check in ]

You trained: Planche + Push
Available: 20 min

Recommended
Wrist + shoulder restoration     18 min
Why: high wrist stiffness + planche loading
[ Start ] [ Adjust ]

Quick resets
[ Desk 5 ] [ Neck 3 ] [ Wrists 5 ] [ Night 10 ]
```

### Body map interaction

- Front/back segmented SVG.
- Tap selects; second tap opens side and severity controls.
- Long press opens detailed history.
- Heat colors reflect selected metric but always include text/icons for accessibility.
- Zoom only where needed, such as wrists/hands.
- “Both” selection is one tap.

### Session-player interaction

- Current drill dominates the screen.
- Controls stay within thumb reach.
- Haptic at 3, 2, 1 seconds and at transitions.
- Side switching is visually unmistakable.
- Screen can dim but remain awake.
- “Wrong” or “replace” is always available without digging into a menu.

### Accessibility

- Dynamic Type.
- VoiceOver labels for body regions and timers.
- Do not rely on color alone.
- Reduce Motion support.
- Captions/transcripts for audio and video.
- Large hit areas.
- High-contrast mode.
- Left-handed player layout option if useful.

---

## 20. Product metrics and quality targets

These metrics are local product-health measures, not growth metrics.

### Core-loop targets

- Median quick check-in completion: under 30 seconds.
- Session start: no more than three meaningful taps from Today.
- Routine generation: perceived instant; target under 300 ms for normal local data size.
- Generated duration: within ±10% or one short exercise of requested time.
- Hard-constraint violations: zero.
- Crash-free completed sessions: target effectively 100% for personal daily use.
- Data-loss incidents: zero.
- Session completion rate.
- Before/after relief or movement-improvement rate.
- Percentage of sessions requiring replacement.
- Reminder-to-session conversion, used to reduce annoyance rather than maximize notifications.

### Learning-quality metrics

- Number of region/context combinations with enough data for an insight.
- Calibration: predicted versus reported response.
- Rate of “not enough data” versus overconfident insight.
- Exercise-ranking stability.
- Percentage of recommendations with a clear explanation.

---

## 21. Delivery roadmap

Each phase has a clear exit criterion. Do not start the next major phase merely because some screens look finished.

### Phase 0 — Product definition and guardrails

#### Build

- Freeze the product vision and P0 scope.
- Choose working name and bundle identifier.
- Create this PRD in the repository.
- Create safety rules document.
- Define body-region taxonomy.
- Define exercise schema.
- Define generator invariants.
- Decide local-first architecture.
- Create ADRs for database, routing, state, and distribution.
- Create `AGENTS.md` for Codex.

#### Exit criteria

- A developer can explain exactly what is and is not in the first release.
- All P0 entities have data definitions.
- Safety and generator invariants are testable statements.
- No backend is required for P0.

### Phase 1 — Repository and app shell

#### Build

- Create Expo TypeScript project with current stable SDK.
- Configure Expo Router.
- Enable strict TypeScript and linting.
- Create design tokens, typography, spacing, radius, and component primitives.
- Implement tab shell and placeholder screens.
- Configure dark/light mode.
- Add error boundary and structured logging.
- Set up unit/component test harness.
- Configure EAS development, preview, and production profiles.
- Build and install the first development client on iPhone immediately.

#### Exit criteria

- Fresh clone runs with documented commands.
- App opens on the actual iPhone.
- Navigation, theme, tests, lint, and typecheck pass.
- A build can be reproduced from a clean commit.

### Phase 2 — Local database and content pipeline

#### Build

- Define SQLite schema and migration runner.
- Add repository layer.
- Add startup migration and backup behavior.
- Define Zod schemas for exercise content.
- Create content validation script.
- Seed body regions, equipment, modes, and first exercises.
- Build hidden database/content debug screens.
- Add export/import skeleton.

#### Exit criteria

- Database survives app restart and upgrade.
- Migrations are tested from an older fixture.
- Invalid exercise content fails validation.
- A generated export can be re-imported into a clean database.

### Phase 3 — Onboarding and profile

#### Build

- Goals.
- Body baseline.
- Equipment.
- Training split.
- Preferred durations.
- Safety acknowledgement.
- Notification preferences placeholder.
- Profile editing.

#### Exit criteria

- A fresh install reaches Today with a complete stored profile.
- Skipping optional questions does not break generation inputs.
- Relaunch does not repeat onboarding unless requested.

### Phase 4 — Daily check-in and body map

#### Build

- Interactive front/back SVG body map.
- Side and severity controls.
- Stiffness/soreness/discomfort.
- Time, readiness, context, environment, and note.
- Check-in persistence.
- Previous-check-in comparison.
- Safety gate.
- Quick presets.

#### Exit criteria

- Normal check-in can be completed comfortably in under 30 seconds.
- Every body region and side persists correctly.
- Safety fixtures trigger expected outcomes.
- Accessibility labels cover every interactive segment.

### Phase 5 — Exercise library

#### Build

- Exercise list, search, filters, and detail.
- Video/animation component.
- Favorite and avoid.
- Alternatives/regressions/progressions.
- Personal notes.
- Expand content to the P0 coverage target.
- Content schema and CI validation.

#### Exit criteria

- Every P0 body region has enough safe candidate coverage.
- Every active exercise passes content validation.
- Missing media never breaks the player.

### Phase 6 — Routine engine version 1

#### Build

- Pure input/output engine package.
- Hard filtering.
- Target-priority calculation.
- Phase templates.
- Candidate scoring.
- Duration budgeting.
- Sequencing.
- Explanation generation.
- Deterministic seed/versioning.
- Validation report.
- Golden fixtures and invariant/property tests.
- Developer trace screen.

#### Exit criteria

- Synthetic scenario suite covers all regions, modes, durations, and equipment contexts.
- No hard-constraint violations.
- Generated routines fit duration and have valid sequencing.
- A stored routine can be exactly reproduced.

### Phase 7 — Routine preview and editor

#### Build

- Recommended routine card on Today.
- Routine preview with phases and reasons.
- Replace, lock, reorder, remove, and regenerate.
- Save routine.
- Duration update when edited.
- Validation after every edit.

#### Exit criteria

- User can understand and modify the routine without entering the player.
- Invalid edits are prevented or clearly resolved.
- Final preview exactly matches the session player prescription.

### Phase 8 — Guided session player

#### Build

- Timed, rep, hold, side, rest, and transition states.
- Video and instruction display.
- Audio and haptics.
- Pause/resume/background recovery.
- Skip/replace/regress.
- Immediate feedback.
- Keep-awake behavior.
- Accurate completion log.

#### Exit criteria

- A 60-minute session can be completed without state corruption.
- Interruptions, app backgrounding, phone lock, and incoming calls have tested behavior.
- Actual duration, dose, skips, replacements, and feedback are stored correctly.

### Phase 9 — Outcomes and progress

#### Build

- Post-session body reassessment.
- Overall usefulness and intensity fit.
- Session history.
- Region trend charts.
- Weekly minutes and consistency.
- Most helpful/avoided exercises.
- Basic body heatmap.

#### Exit criteria

- Check-in → routine → session → outcome is one complete historical record.
- Charts distinguish no data from zero symptoms.
- Deleting a session updates derived statistics safely.

### Phase 10 — Scheduling and notifications

#### Build

- Saved routines and weekly plan.
- Local notifications.
- Desk-reset schedule.
- Quiet hours.
- Snooze, skip, and deep-link actions.
- Training-linked reminders.
- Notification debug preview.

#### Exit criteria

- Notifications fire at expected local times across restart and time-zone changes.
- Tapping a notification opens the correct routine.
- User can fully disable reminders.

### Phase 11 — Personalization engine

#### Build

- Exercise-response aggregates.
- Favorite/avoid and response weighting.
- Context-specific effectiveness.
- Dose adaptation.
- Delayed follow-up.
- Confidence and minimum-sample rules.
- “Why this changed” explanations.

#### Exit criteria

- Recommendations change predictably after fixture histories.
- One bad result cannot permanently distort the model.
- Every learned effect can be reset or inspected.

### Phase 12 — Assessments

#### Build

- Standardized manual assessments.
- Left/right results.
- Assessment reminders.
- Charts and comparison.
- Camera capture placeholder.

#### Exit criteria

- Test-retest data has clear conditions and units.
- Assessment results influence generation only through explicit rules.

### Phase 13 — Apple Health and native integrations

#### Build

- HealthKit permission layer.
- Read selected recovery context.
- Data freshness/source display.
- Optional workout writing.
- App Intents and Shortcuts.
- Widgets.
- Live Activity.
- Face ID lock.

#### Exit criteria

- Denying any permission leaves the core app fully functional.
- Health inputs are inspectable and removable.
- Widgets/intents deep-link reliably.
- Live Activity always terminates.

### Phase 14 — Advanced intelligence

#### Build

- Natural-language and voice check-in parsing.
- Personal weekly summaries.
- Data-grounded question answering.
- Camera angle estimation.
- Personal experiments.
- Optional Laravel API for secure remote AI and sync.

#### Exit criteria

- Every AI output clearly distinguishes raw data, computation, and suggestion.
- AI cannot introduce an unapproved exercise or bypass a safety rule.
- Camera measurements expose confidence and manual correction.

### Phase 15 — Apple Watch and Personal OS

#### Build

- Watch session controls and haptics.
- Complication.
- Shared events with Leverly.
- Cross-app training context.
- Unified recovery and mobility dashboard.

#### Exit criteria

- The Watch experience adds hands-free value rather than duplicating the phone.
- Cross-app contracts are versioned and resilient when one app is absent.

---

## 22. Exact first-release scope

The first version that should become part of daily life contains only this:

1. Onboarding/profile.
2. Interactive body check-in.
3. Manual training context.
4. 2–90-minute duration selection.
5. Curated exercise library with approximately 45–60 well-tagged movements.
6. Deterministic routine engine.
7. Routine preview and replacements.
8. Guided session player with timer, video, haptics, and audio.
9. Before/after feedback.
10. Basic history and region trends.
11. Desk and scheduled local reminders.
12. JSON/CSV export.
13. Direct installation on the personal iPhone.

Explicitly defer from first release:

- HealthKit.
- Laravel backend.
- Login.
- Cloud sync.
- AI.
- Camera analysis.
- Widgets.
- Live Activities.
- Apple Watch.

This cutoff is not timid; it protects the one loop that makes every later feature valuable.

---

## 23. Codex execution model

### 23.1 Repository instructions for Codex

Create an `AGENTS.md` containing at least:

- Product objective and scope.
- Local-first requirement.
- Architecture boundaries.
- Exact commands for install, lint, typecheck, tests, content validation, and build checks.
- Rule that the generator remains platform-independent.
- Rule that migrations and data-destructive changes require explicit tests.
- Rule that no dependency is added without documenting purpose and alternatives.
- Rule that no AI-created exercise becomes active without complete reviewed metadata.
- Rule that P0 accessibility is part of done, not cleanup.
- Rule that generated code must not weaken safety invariants.
- Formatting and naming conventions.
- Definition of done for every ticket.

### 23.2 One milestone per Codex task

Do not prompt Codex with “build the entire app.” Use narrow, reviewable tasks.

Every task should provide:

1. Context and relevant ADRs.
2. Exact user story IDs.
3. Files/directories allowed to change.
4. Functional requirements.
5. Non-functional requirements.
6. Tests required.
7. Commands Codex must run.
8. Explicit exclusions.
9. Expected final summary and known limitations.

### 23.3 Standard Codex prompt template

```text
You are implementing milestone <ID> in the Restore mobile app.

Read first:
- AGENTS.md
- docs/product/restore-roadmap.md
- docs/architecture/<relevant ADRs>
- docs/safety/generator-invariants.md

Implement user stories:
- <IDs>

Goal:
<One concrete outcome>

Requirements:
- ...

Non-goals:
- ...

Architecture constraints:
- ...

Tests required:
- ...

Before finishing, run:
- pnpm lint
- pnpm typecheck
- pnpm test
- pnpm content:validate

Return:
1. Summary of changes.
2. Files changed.
3. Test results.
4. Any assumptions or remaining risks.
```

### 23.4 Recommended first Codex ticket sequence

1. **BOOT-001:** Create Expo project, routing, strict TypeScript, lint, test harness, and app shell.
2. **DX-001:** Add `AGENTS.md`, scripts, CI, environment validation, and ADR structure.
3. **UI-001:** Create tokens and base components: screen, card, button, slider, segmented control, sheet, badge, empty/error states.
4. **DB-001:** Add SQLite, migrations, repositories, startup initialization, and migration tests.
5. **CONTENT-001:** Define exercise/body/equipment Zod schemas and validation command.
6. **CONTENT-002:** Seed body regions, equipment, modes, and ten sample exercises.
7. **ONB-001:** Implement onboarding profile flow.
8. **CHK-001:** Implement check-in form without body map.
9. **MAP-001:** Implement accessible front/back SVG body map and integrate with check-in.
10. **SAFE-001:** Implement input safety gate and fixtures.
11. **LIB-001:** Implement library list/detail/favorites/avoid.
12. **GEN-001:** Define pure engine types, templates, and hard filtering.
13. **GEN-002:** Add priority scoring, duration budgeting, sequencing, explanations, and tests.
14. **GEN-003:** Add developer trace and scenario simulator.
15. **ROUTINE-001:** Build routine preview and replace/regenerate flows.
16. **PLAYER-001:** Implement player state machine and non-media UI.
17. **PLAYER-002:** Add media, audio, haptics, background recovery, and logs.
18. **FDB-001:** Add post-session outcomes and exercise response.
19. **PRO-001:** Add history, weekly metrics, and region trends.
20. **NOTIF-001:** Add local reminder scheduling and deep links.
21. **DATA-001:** Complete export/import/delete-all and migration backups.
22. **RELEASE-001:** Harden preview build, test on iPhone, and create release checklist.

### 23.5 Review gate after every ticket

- Read the diff.
- Run all commands locally.
- Exercise the feature on the iPhone when UI/native behavior changed.
- Add or update a regression test for every bug found.
- Commit one coherent change.
- Do not allow Codex to quietly “simplify” domain or safety rules to make tests pass.

---

## 24. Testing strategy

### Unit tests

- Pure routine engine.
- Scoring terms.
- Phase budgets.
- Duration estimator.
- Safety rules.
- Date/time scheduling helpers.
- Statistics and confidence calculations.
- Import/export validation.

### Property/invariant tests

Generate many valid and adversarial check-ins and assert:

- No contraindicated exercises.
- No missing equipment.
- Duration bounds.
- Valid phase order.
- Bounded dosage.
- No duplicate IDs.
- Stable deterministic output for same input/version/seed.
- A safe fallback exists.

### Repository/database tests

- CRUD and transaction behavior.
- Migration from every released schema.
- Interrupted migration recovery.
- Backup before destructive migration.
- Historical version integrity.
- Delete cascade and orphan prevention.

### Component tests

- Body-map selection.
- Severity controls.
- Routine preview.
- Player state controls.
- Progress empty/loading/error states.
- Accessibility labels and keyboard behavior where relevant.

### Integration tests

- Onboarding → profile.
- Check-in → generated routine.
- Routine edit → valid session.
- Session → outcome → progress.
- Reminder → deep link → session.
- Export → clean install → import.

### On-device E2E tests

- Fresh install.
- Upgrade from previous preview build.
- Airplane mode.
- App background/foreground during timer.
- Phone lock during session.
- Notification action.
- Low Power Mode.
- Dark/light mode.
- Large text.
- Permission denial.
- Interrupted audio.
- Time-zone/DST change.

### Manual safety/content review

- Every active exercise.
- Every contraindication and alternative path.
- Every red-flag response.
- Every session mode at minimum and maximum duration.
- Every body region with no equipment.

---

## 25. Release and versioning strategy

### Version dimensions

Track these separately:

- App semantic version.
- iOS build number.
- Expo runtime version.
- Database schema version.
- Exercise content version.
- Routine-engine version.
- Rules/configuration version.

### Channels

- `development` — dev client and local Metro.
- `preview` — production-like personal build installed directly.
- `production` — TestFlight/App Store binary if used.

### Release rules

- JavaScript, styling, and compatible asset changes can use an over-the-air update after preview testing.
- Native dependency, entitlement, permission, Expo SDK, or native-interface changes require a new binary/runtime.
- Database migrations must be forward-only in released builds, with recovery backup.
- Content updates must be schema validated and versioned.
- Engine changes require golden-fixture review.
- Every release has a rollback or recovery path.

---

## 26. From inception to the app running on the iPhone

This is the complete practical path for a Linux-based development setup using Expo's cloud iOS build pipeline.

### Step 1 — Apple and Expo accounts

1. Register a free Apple developer account with the Apple Account used on the iPhone.
2. Enroll in the paid Apple Developer Program as an individual for reliable signing, device distribution, TestFlight, and App Store Connect access.
3. Ensure two-factor authentication and agreements are complete.
4. Create an Expo account.

### Step 2 — Local prerequisites

Install:

- Git.
- Current Node.js LTS through `nvm` or equivalent.
- `pnpm`.
- EAS CLI.
- A code editor and Codex workflow.

Suggested checks:

```bash
node --version
pnpm --version
git --version
eas --version
```

### Step 3 — Create the project

Use the current stable Expo template. At the time this roadmap was prepared, Expo's official new-project guidance uses the latest stable SDK template.

```bash
npx create-expo-app@latest restore --template default@sdk-57
cd restore
pnpm install
git init
git add .
git commit -m "chore: bootstrap Restore"
```

After project creation, immediately add the roadmap, `AGENTS.md`, ADRs, strict checks, and CI rather than letting architecture emerge accidentally.

### Step 4 — Configure app identity

Choose a permanent bundle identifier early, for example:

```text
nl.thijs.restore
```

Configure in `app.config.ts`:

- App name and slug.
- iOS bundle identifier.
- Custom URL scheme such as `restore`.
- iPhone-only or tablet support decision.
- App icon and splash assets.
- Version and runtime-version policy.
- Required plugins and permission messages.

Do not request HealthKit, camera, microphone, notification, or Face ID permissions until the feature using each permission exists.

### Step 5 — Configure EAS

```bash
eas login
eas build:configure
```

Use three profiles in `eas.json`:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "channel": "development"
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview"
    },
    "production": {
      "channel": "production",
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

Initialize EAS Update after the first stable native configuration:

```bash
eas update:configure
```

### Step 6 — Register the iPhone

From the project directory:

```bash
eas device:create
```

Open the generated registration URL on the iPhone, install the profile when prompted, and complete device registration. Enable Developer Mode on the iPhone for development builds.

### Step 7 — Build the development client

```bash
eas build --platform ios --profile development
```

Let EAS manage the initial signing certificate and provisioning profile unless there is a specific reason to manage them manually.

When the build completes:

- Open the EAS install URL or QR code on the registered iPhone.
- Install the development build.
- Trust/enable the required developer settings when prompted.

### Step 8 — Run the app during development

On the Linux machine:

```bash
npx expo start --dev-client
```

Open Restore on the iPhone and connect to the development server. Use a tunnel only when LAN connectivity is inconvenient; normal local-network development is usually faster.

At this point, the app is genuinely running on the iPhone and every milestone should be tested there—not only in a browser or Android emulator.

### Step 9 — Create a production-like personal build

When a milestone is stable:

```bash
eas build --platform ios --profile preview
```

The preview profile creates an internally distributed, production-like iOS build for registered devices. Install it from the EAS link. It does not depend on a development server and is the best default daily-driver build during this personal project.

### Step 10 — Ship compatible updates without rebuilding

After preview testing, compatible JavaScript/style/asset updates can be published to the preview channel:

```bash
eas update \
  --channel preview \
  --message "feat: improve wrist check-in flow" \
  --environment preview
```

A new binary is still required after adding or changing native modules, capabilities, entitlements, native permissions, or an incompatible runtime.

### Step 11 — Optional TestFlight route

Use TestFlight when easier update distribution is worth periodic build renewal.

```bash
eas build --platform ios --profile production
eas submit --platform ios
```

Then:

1. Open App Store Connect.
2. Complete the minimum app/test information.
3. Add the build to internal testing.
4. Add the owner account as an internal tester.
5. Install Apple's TestFlight app on the iPhone.
6. Accept the invitation and install Restore.

TestFlight builds expire after 90 days, so either upload another build before expiry or use the direct internal/preview distribution route for longer personal testing cycles.

### Step 12 — Optional App Store release

Only pursue App Store review when one of these becomes desirable:

- Indefinite store-managed installation and updates.
- Use on devices not registered for ad hoc distribution.
- Sharing with other people.
- A public or unlisted release.

For a single personal iPhone, this is not required for the initial project.

### Step 13 — Ongoing signing maintenance

- Keep Apple Developer membership active.
- Renew/rebuild when provisioning profiles or signing credentials expire.
- Register a replacement iPhone before building an ad hoc preview for it.
- Keep app, runtime, database, content, and engine versions visible in Settings.
- Maintain an export before major upgrades.

---

## 27. Recommended personal distribution choice

### During active development

Use an **EAS development build** connected to Metro.

### For daily use between coding sessions

Use an **EAS preview/internal distribution build** installed directly on the registered iPhone. It behaves like a production app, does not require Metro, and can receive compatible EAS Updates.

### When convenience of TestFlight updates is preferred

Use an **internal TestFlight build**, while remembering that each build is available for up to 90 days.

### Not needed initially

A public App Store release, enterprise distribution, or Apple Business Manager setup.

---

## 28. First release checklist

### Product

- [ ] P0 scope frozen.
- [ ] All core body regions covered.
- [ ] All active exercise content reviewed.
- [ ] Generator explanations are understandable.
- [ ] Safety messages are useful and not diagnostic.

### Data

- [ ] Fresh install initializes correctly.
- [ ] Upgrade migration tested.
- [ ] Export/import round-trip passes.
- [ ] Delete-all works.
- [ ] Historical routine versions remain intact.

### Engine

- [ ] All invariant tests pass.
- [ ] Scenario simulation produces no hard violations.
- [ ] Duration tolerance passes.
- [ ] Reproduction by seed/version passes.
- [ ] Safe fallback works.

### Session player

- [ ] Long session completed on physical iPhone.
- [ ] Background/foreground tested.
- [ ] Lock/unlock tested.
- [ ] Audio interruption tested.
- [ ] Skip/replace/regress tested.
- [ ] Battery impact is reasonable.

### Notifications

- [ ] Permission denial works.
- [ ] Quiet hours work.
- [ ] Deep links work.
- [ ] Snooze/skip works.
- [ ] Time-zone change tested.

### Accessibility

- [ ] VoiceOver smoke test.
- [ ] Dynamic Type.
- [ ] Reduce Motion.
- [ ] Dark/light mode.
- [ ] No color-only state.
- [ ] Large touch targets.

### Release

- [ ] Clean Git state.
- [ ] Version/build/runtime updated.
- [ ] Preview build installed from scratch.
- [ ] EAS Update channel verified.
- [ ] Backup/export created.
- [ ] Changelog written.
- [ ] Known limitations documented.

---

## 29. Risks and deliberate mitigations

| Risk | Mitigation |
|---|---|
| Scope becomes enormous before the daily loop works. | Strict P0 cutoff and phase exit criteria. |
| Generator recommends nonsense despite polished UI. | Curated metadata, hard constraints, pure engine, scenario simulation, explanations. |
| Exercise library becomes inconsistent. | Versioned schemas, content validation, review checklist, smaller high-quality library. |
| AI introduces unsafe or invented advice. | AI cannot activate content or bypass deterministic validation. |
| Personal data is lost during iteration. | Local backup before migrations, export/import, migration fixtures, immutable history. |
| Notifications become irritating. | Quiet hours, daily caps, adaptive reduction, one-tap disable. |
| Health data creates false precision. | Source/freshness display, transparent formulas, manual override, observational wording. |
| Expo native integration becomes limiting. | Development builds, config plugins, Expo Modules/native modules when needed; architecture keeps platform services isolated. |
| TestFlight build expires unexpectedly. | Prefer preview/ad hoc daily build or schedule a fresh production build before 90 days. |
| Codex makes broad unreviewed changes. | Narrow tickets, allowed-file scopes, mandatory tests, diff review, AGENTS/ADRs. |

---

## 30. Future “delight” ideas

These are intentionally not P0, but they can make Restore unusually good.

- A morning widget that says “Your wrists recovered; thoracic rotation is today's priority.”
- Action Button starts a silent two-minute desk reset.
- Dynamic Island shows “Right side · 18 sec” during a hold.
- AirPods controls pause or advance the player.
- A desk NFC sticker launches Desk Rescue through Shortcuts.
- A gym NFC tag opens the planned pre-workout routine.
- A “body rewind” slider animates the heatmap over the previous month.
- Ghost-overlay comparison of current and prior shoulder-flexion assessment.
- A “what changed?” explanation after recommendations adapt.
- A personal finding such as “Two or more desk resets are associated with lower evening neck stiffness in 8 of 11 comparable days.”
- Automatic “minimum viable routine” when a planned 30-minute session is missed.
- A zero-screen Apple Watch mode with only haptics and next/previous.
- Spatial audio cues for left/right switching.
- A calm night mode that fades cues and lowers screen brightness.
- Local voice commands such as “repeat that cue” or “make this easier.”
- Routine snapshots attached to training sessions in Leverly.
- A Personal OS morning briefing combining sleep, recovery, training, and mobility priorities.
- An on-device “movement notebook” that retrieves every note or clip about the right wrist.
- A monthly auto-generated review with trends, experiments, and next focus areas.
- An “exercise retirement” suggestion when a drill no longer adds measurable benefit.
- A confidence-aware recommendation that admits when the app lacks enough data.

---

## 31. Final build philosophy

The app should grow in this order:

1. **Reliable logging.**
2. **Safe generation.**
3. **Excellent session execution.**
4. **Useful feedback.**
5. **Personal learning.**
6. **Apple-platform convenience.**
7. **Advanced intelligence.**

The winning first version is not the one with the most integrations. It is the one that makes opening Restore after a planche session, selecting “right wrist + shoulders + 15 minutes,” and completing a genuinely useful routine feel effortless.

Once that loop works every day, the rest of the roadmap becomes compounding value rather than decorative complexity.
