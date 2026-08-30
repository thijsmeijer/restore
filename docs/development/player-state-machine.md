# PLAYER-001 session player contract

- **Status:** Implemented engineering milestone; physical-device review pending
- **Stories:** PLAYER-001, partial SES-001–007
- **Required context:** first-release scope, roadmap Phase 8, ADRs 0002–0004,
  safety policy, generator invariants, and data definitions

## Outcome

PLAYER-001 adds the pure session state machine and the non-media, focused player
UI. It consumes the exact immutable prescription shown in routine preview. It
does not regenerate dosage, read content files, use a clock internally, or write
domain facts from the UI.

The preview can start a ready routine. The player supports:

- timed holds and timed movements with automatic progression;
- repetition, breathing-cycle, and reassessment steps with explicit completion;
- ordered sides, sets, between-set rests, and between-movement transitions;
- pause/resume, previous step, next step, skip movement, and finish early;
- elapsed and estimated remaining time;
- one-tap helpful and neutral responses; and
- an always-visible `Feels wrong` action that pauses immediately and blocks
  automatic progression until the user ends the session or skips the movement.

The controls use text as well as shape, expose accessibility state and values,
and are sized for use from a mat or floor. The UI does not depend on animation,
sound, haptics, or color to communicate state.

Because the bundled exercise pack is not clinically active, development builds
also expose a controls-only preview from Settings. It assigns no movement,
persists nothing, and is redirected away in non-development builds. It exists
only so the interaction and accessibility behavior can be reviewed on the
physical iPhone without bypassing content review.

## State-machine boundary

`src/features/player/player-state-machine.ts` is pure TypeScript. Its only
input is an ordered routine prescription and explicit events. A `tick` event is
supplied by the UI; the state machine has no clock, React Native, database,
network, file, notification, or global-state dependency.

Timed exercise, rest, and transition steps may advance automatically. Repetition,
breathing-cycle, and reassessment steps never advance solely because their
estimated time elapsed. The user must confirm completion. Pause, finish
confirmation, and unresolved wrong-response states reject ticks.

The stage plan preserves each routine item's exact estimated duration. For
manual-dose steps, the active estimate is derived only for remaining-time
display; the exact dose shown to the user remains the stored dose.

## Safety behavior

`Feels wrong` immediately changes the pure state to `wrong_prompt`, marks the
current item response as uncomfortable in transient state, and stops tick
processing. The prompt offers only actions that resolve the stop:

1. skip the current movement; or
2. end the session.

Reviewed in-session regression/replacement, temporary/permanent avoidance, and
red-flag reassessment require the durable session workflow delivered in
PLAYER-002. Until then, the player does not offer an unvalidated replacement or
claim to have stored an avoid decision.

## Explicit PLAYER-002 deferrals

PLAYER-001 deliberately does not create `session_logs` or `session_item_logs`,
change a routine to `started`/`completed`, persist feedback, checkpoint active
state, recover from background/restart, keep the screen awake, display media, or
emit audio/haptics. Those behaviors are one coherent PLAYER-002 persistence and
platform-integration milestone.

Consequently, PLAYER-001 is suitable for state-machine and interaction review,
but is not yet a recoverable or complete logged session. The UI states this at
session completion without exposing implementation terminology.

## Acceptance evidence

- Unit tests cover exact stage construction, automatic and manual progression,
  sides, sets, rests, transitions, pause/resume, previous/next/skip, finish
  confirmation, and wrong-response blocking.
- Component tests cover player copy, accessibility values, large core controls,
  feedback, and the wrong-response resolution flow.
- Routine-preview tests prove that only a ready routine exposes `Start routine`.
- `pnpm verify` remains the repository-wide gate.

## Non-goals

- No schema or migration change.
- No native permission, entitlement, dependency, or backend.
- No outcome/history UI.
- No clinically unreviewed content is activated.
