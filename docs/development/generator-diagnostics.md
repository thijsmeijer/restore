# GEN-003 generator diagnostics contract

## Scope resolution

The roadmap currently uses `GEN-003` for two different descriptions. The Epic C
table calls it equipment and space matching, while the approved implementation
sequence calls it the developer trace and scenario simulator. Equipment, space,
environment, and unstable-equipment exclusion were already delivered and tested
as hard filters in GEN-001. This ticket therefore follows the implementation
sequence and records its exact scope as:

- `GEN-003`: privacy-redacted generator decision trace and synthetic scenario
  simulator;
- related P0 developer-control inventory from the normalized first-release
  scope; and
- the local portions of `DEV-005` and `DEV-006`, without changing their backlog
  priority labels.

## Outcome and allowed files

The ticket may change generator diagnostics and exports, synthetic developer
scenarios, the developer-only route and Settings entry point, the platform share
adapter, its CLI command, tests, and this contract. It must not change active
exercise status, clinical-review metadata, SQLite data, check-in behavior,
routine selection behavior, or release permissions.

## Functional requirements

- Trace the fixed generator decision stages and their stable reason codes.
- Include candidate score terms, selections, rejections, prescriptions, and the
  final result without reimplementing or bypassing generation.
- Produce deterministic human-readable and JSON forms.
- Run a bounded one-axis-at-a-time synthetic matrix across every 2–90-minute
  duration, bundled mode, selectable body region, equipment state, and generator
  safety state. A suite above 1,000 cases fails before execution.
- Make the suite runnable with `pnpm generator:scenarios` and from a
  development-build screen.
- Keep the route and Settings entry point unavailable in production builds.
- Put system sharing behind a testable interface.

## Privacy, safety, and accessibility

Default traces contain content identifiers, stable reason codes, score points,
routine structure, version metadata, and aggregate scenario counts only. They do
not contain check-in or routine owner identifiers, timestamps, target names or
ratings, symptom values, safety answers, equipment values, preference values,
training details, notes, media, or score-term reference values. Sharing is an
explicit developer action.

The simulator calls the same public generator entry point and cannot weaken a
filter, synthesize an active exercise, or turn a failure into a routine. The
screen uses named buttons, headings, readable text, Dynamic Type-compatible
layout, and a status announcement; it adds no gesture, motion, sound, or
color-only meaning.

## Tests and commands

Required automated coverage includes deterministic/redacted traces, successful
and failed results, expectation mismatches, duplicate scenario IDs, complete
matrix axes, the CLI suite, route visibility, sharing through a fake, and
Settings navigation.

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm content:validate
pnpm generator:scenarios
pnpm verify
```

## Explicit non-goals and known limitation

This ticket does not persist traces, inspect owner data, add a general export
format, ship reviewed content, or add routine preview/editing. The bundled
catalog remains draft-only, so its development suite expects explicit
fail-closed results (and a blocked safety result where applicable). Successful
generation is covered by isolated test fixtures; the bundled suite must be
updated deliberately when reviewed templates and exercise versions are later
activated.
