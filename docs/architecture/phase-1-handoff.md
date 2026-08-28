# Phase 1 handoff: repository and app shell

Phase 1 may start only after the owner approves the first-release scope. Clinical
review remains a daily-use release gate and does not block application bootstrap.

## Pre-bootstrap identity gate

Before running a project generator, record in ADR 0005:

- Permanent iOS bundle identifier.
- Permanent URL scheme.
- Apple Developer and Expo account readiness.
- Whether the first physical-device build uses the recommended internal EAS
  distribution.

The working display name is already `Restore` and the first release is
iPhone-only.

## BOOT-001 outcome

Create a current stable Expo/React Native TypeScript application in this
repository without replacing Phase 0 documentation. Pin all versions and record
the selected Expo SDK, Node, pnpm, and EAS CLI requirements.

Deliver:

- Expo Router and the five-tab placeholder shell.
- Strict TypeScript.
- Linting and formatting checks.
- Jest/jest-expo and React Native Testing Library harness.
- Light/dark theme foundation, error boundary, and structured local logging.
- Development, preview, and production EAS profiles.
- Environment doctor/setup documentation.
- A first development build installed and opened on the registered iPhone.

Do not add SQLite schema, feature forms, content, the generator, notifications,
HealthKit, AI, backend code, or unused native permissions in BOOT-001.

## DX-001 outcome

Make the repository command contract real:

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm content:validate
pnpm verify
```

`pnpm verify` runs all applicable non-mutating checks. Until Phase 2 content
exists, `content:validate` validates an empty/versioned content-pack fixture or
reports a documented no-content success; it must not be omitted.

Add CI using the same commands, dependency-purpose documentation, pull-request
review expectations, and an environment check that reports missing tools without
installing them silently.

## Exit evidence

- Fresh-clone commands succeed from documentation.
- Lint, typecheck, tests, content validation, and aggregate verification pass.
- Navigation and light/dark mode work.
- The clean commit builds reproducibly.
- The app opens on the physical iPhone.
- No P0 safety/domain rules have been moved into platform-specific UI code.
