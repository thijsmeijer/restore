# Safety policy

**Status:** Engineering baseline; qualified clinical review required before
daily use  
**Applies to:** Check-in, routine generation, exercise content, routine editing,
session player, imports, and developer tooling

## Purpose and boundary

Restore supports self-guided mobility, breathing, low-load control, and recovery.
It does not diagnose a condition, determine that movement is medically safe, or
replace professional or urgent care. When information is incomplete or
ambiguous, the app must choose the more conservative outcome and explain why.

The user must be able to exit any safety message, inspect or delete their data,
and use non-exercise parts of the app. Acknowledging a disclaimer never bypasses
a safety rule.

## Safety result contract

Every submitted check-in produces one of these stored results before generation:

| Result | Generator behavior | User experience |
|---|---|---|
| `clear` | Normal generation may continue; exercise-level filters still apply | Show no alarmist messaging |
| `gentle_only` | Only explicitly gentle content, low intensity, conservative dosage, and allowed session templates are eligible | Explain the triggering input, show stop rules, and allow the user to decline |
| `blocked` | Do not generate or regenerate a routine | State that the report is outside Restore’s self-guided scope, advise stopping aggravating movement, and recommend appropriate professional or urgent evaluation based on severity |

The result stores stable rule IDs and user-facing reason codes, not a guessed
diagnosis. Imported or edited check-ins must pass the same gate.

## Input rules

The initial ruleset must classify the following as `blocked`:

- Sudden severe pain.
- Recent major trauma.
- New numbness or tingling.
- Unexplained weakness or loss of control.
- Radiating symptoms.
- Significant swelling or visible deformity.
- Dizziness, fainting, chest symptoms, or breathing difficulty.
- A rapidly worsening problem.

`gentle_only` is permitted only for reviewed, non-red-flag combinations such as
low readiness, ordinary post-training soreness, or mild non-worsening
discomfort within the configured threshold. Clinical review must approve the
exact thresholds and copy before daily use.

Free text is never silently interpreted as safe. In P0, structured safety inputs
control the gate; a note that cannot be interpreted remains contextual text.

## Exercise contraindications

Each active exercise defines machine-readable exclusions and cautions for:

- Region and applicable side.
- Symptom quality and severity threshold.
- Recent trauma and instability.
- Weight bearing and balance demand.
- End-range loading.
- Neck, wrist, shoulder, and spinal position or demand.
- Intensity ceiling, environment, equipment stability, and required space.

A hard exclusion removes the exercise before scoring. A caution may reduce
dosage or require an explicitly reviewed gentle variant, but it may never be
implemented as an unbounded score penalty.

## Dosage policy

Every selectable exercise version defines:

- Prescription type and default, minimum, and maximum dose.
- Maximum sets per routine.
- Allowed sides and side-switch behavior.
- Maximum intensity by session mode.
- Allowed progression step and whether extension is permitted.
- Weekly exposure limit where content review establishes one.

Routine editing, automatic advance, replacement, “extend,” and resume behavior
must revalidate dosage. Stored historical prescriptions are not retroactively
changed when content limits change.

## In-session stop behavior

The player always exposes a one-tap `Feels wrong` action. It immediately pauses
the current exercise and records the response. The user can then:

1. end the session;
2. skip the exercise;
3. use a pre-reviewed regression or replacement that passes all current
   constraints; or
4. temporarily or permanently avoid the exercise.

If the follow-up reports a red flag or crosses a reviewed threshold, the session
becomes `safety_stopped`, no replacement is generated, and the blocked message
is shown. Automatic advance cannot run while this flow is unresolved.

## Safety copy rules

- Describe the reported input and the product boundary; do not name a diagnosis.
- Do not promise that an exercise, routine, or absence of a red flag is safe.
- Do not use shame, urgency inflation, or false reassurance.
- Use urgent wording only for the clinically reviewed urgent category.
- Keep stop instructions visible in the check-in result, routine preview, and
  player.
- Provide accessible text independent of color, icons, animation, or sound.

## Review and change control

Before daily use, a qualified clinician must review:

- Red-flag questions, classification, thresholds, and user-facing copy.
- Every active exercise’s contraindications, dosage limits, stop conditions,
  regression path, and intended effects.
- Every gentle template and blocked/gentle-only fallback.

Review records include reviewer, date, content/rules versions, findings, and
approval status. Any material change invalidates approval only for the affected
rules or content versions and requires re-review before release.

## Required verification

- A fixture for every safety rule at, below, and above relevant thresholds.
- Combined/adversarial fixtures choose the most conservative result.
- Blocked input cannot produce a routine through generate, regenerate, replace,
  import, deep link, debug tooling, or resume paths.
- Gentle-only output contains only reviewed gentle content and bounded dosage.
- The `Feels wrong` action pauses immediately and prevents automatic advance.
- Accessibility tests cover every safety message and action.
- Logs and diagnostic exports use reason codes and exclude free-text notes by
  default.
