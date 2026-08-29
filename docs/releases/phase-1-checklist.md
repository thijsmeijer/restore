# Phase 1 repository and app-shell checklist

## Identity and foundation

- [x] Display name is `Restore`.
- [x] iOS bundle identifier is `com.restore.mobility`.
- [x] URL scheme is `restore`.
- [x] App configuration is iPhone-only and requests no unused permissions.
- [x] Stable Expo SDK 57 foundation and compatible package versions are pinned.
- [x] Node 24.14.0, pnpm 10.33.2, and EAS CLI 18.3.0 are documented.

## Application shell

- [x] Expo Router root and Today, Library, Progress, Plan, and Settings tabs.
- [x] Strict TypeScript and path aliases.
- [x] Light/dark design tokens and reusable screen, card, and button primitives.
- [x] Accessible placeholder screens.
- [x] Root error boundary and structured redacted logging foundation.
- [x] No database, health content, generator, notifications, or remote services.

## Quality and build configuration

- [x] Expo lint and deterministic formatting checks.
- [x] Jest/jest-expo and React Native Testing Library component test.
- [x] Empty draft content manifest and validation command.
- [x] Environment doctor and aggregate `pnpm verify` command.
- [x] Development, preview, and production EAS profiles.
- [x] Expo Doctor passes all checks.
- [x] iOS JavaScript/Hermes export succeeds.
- [x] Production dependency audit reviewed; one documented moderate Expo
  build-tool transitive advisory remains.
- [x] GitHub selected and the DX-001 verification pipeline passes.

## External/device gates

- [x] Expo account login confirmed and EAS project linked.
- [x] Apple Developer paid enrollment activated.
- [x] Personal iPhone registered for internal distribution.
- [ ] Development build installed and opened on the physical iPhone.

The local BOOT-001 implementation and DX-001 CI are complete. Phase 1 exits
after the remaining Expo and physical-device gates are complete.
