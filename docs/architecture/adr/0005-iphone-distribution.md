# ADR 0005: iPhone identity and distribution

- **Status:** Accepted
- **Date:** 2026-08-28

## Context

Restore is a personal iPhone-first product developed from Linux. It needs native
testing early and a production-like daily build without requiring a public App
Store launch.

## Decision

Use **Restore** as the working display name. The first release is iPhone-only;
iPad-specific support is deferred.

Use EAS development builds connected to Metro during active development and EAS
internal preview distribution for daily personal use. TestFlight is optional;
public App Store distribution is not P0.

The permanent iOS bundle identifier is `com.restore.mobility` and the URL scheme
is `restore`. Both must be used consistently in app configuration and signed
builds. Apple Developer enrollment has been paid and is pending activation;
local Phase 1 work may continue, while device registration and signed iOS builds
remain blocked until activation. Bundle-ID availability is confirmed when it is
first registered with Apple; if Apple rejects it as unavailable, this decision
must be reopened before any signed build exists.

Do not declare or request HealthKit, camera, microphone, notification, or Face
ID permissions until the corresponding feature exists. Notification permission
is first eligible in Phase 10.

## Consequences

- Physical-iPhone validation begins in Phase 1, not at the end of the project.
- Development, preview, and production use distinct EAS profiles/channels.
- Native dependency, entitlement, permission, SDK, or runtime changes require a
  compatible new binary; compatible JS/style/asset changes may use EAS Update
  only after preview testing.
- Apple/Expo account readiness and signing remain external prerequisites.

## Alternatives rejected or deferred

- **Public App Store first:** unnecessary scope for a single personal device.
- **TestFlight as the only daily route:** builds expire and add avoidable release
  administration.
- **`nl.thijs.restore`:** not selected; the owner chose
  `com.restore.mobility` during the Phase 1 identity gate.
