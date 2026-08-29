# Development setup

## Pinned foundation

- Expo SDK 57 (`expo` 57.0.x).
- React Native 0.86 and React 19.2.
- Node.js 24.14.0 locally and in EAS builds; SDK 57 requires Node 22.13 or newer.
- pnpm 10.33.2 through Corepack.
- EAS CLI 18.3.0 or newer.

The versions were selected from the stable Expo guidance on 28 August 2026.
Upgrade them only in a dedicated dependency change with Expo Doctor, tests, and
native-build impact review.

## Fresh clone

```bash
corepack enable pnpm
pnpm install --frozen-lockfile
pnpm doctor
pnpm verify
```

Start the development client bundler with:

```bash
pnpm start
```

`pnpm start:go` is available for early shell inspection, but the project’s
normal development target is an EAS development client.

## Accounts and iPhone status

- Bundle identifier: `com.restore.mobility`.
- URL scheme: `restore`.
- Apple Developer enrollment: paid and pending activation as of 28 August 2026.
- Expo login: confirm with `eas whoami` before linking or building.

Local development and verification can continue while Apple enrollment is
pending. Device registration and a signed iOS development build must wait for
activation.

After activation:

```bash
eas login
eas device:create
eas build --platform ios --profile development
```

Do not run `eas update:configure` until the first stable native configuration
has been built and tested.

## Verification commands

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm content:validate
pnpm build:check
pnpm verify
```

The Phase 1 content manifest is intentionally empty and `draft`.

## GitHub workflow

GitHub Actions runs the same `pnpm verify` command for pushes and pull requests
to `main`. See [`ci.md`](./ci.md) for permissions, pinned actions, pull-request
expectations, and the recommended branch ruleset.
