# ADR 0001: Local-first mobile architecture

- **Status:** Accepted
- **Date:** 2026-08-28

## Context

Restore is initially a single-user personal mobility app whose core loop must
work fully offline and keep personal health-adjacent data on the device. Backend
features are explicitly outside the first release.

## Decision

Build Restore as one Expo/React Native TypeScript repository with strict
TypeScript. The mobile application owns its local data and routine engine. The
engine is a pure platform-independent module.

No backend, account, remote analytics SDK, network dependency, or remote routine
generation is permitted in P0. Platform services and any future remote services
must sit behind interfaces so core behavior can use local implementations and
tests can use fakes.

Exact Expo, React Native, and package versions are selected and pinned during
Phase 1 using then-current stable, mutually compatible releases.

## Consequences

- Airplane mode is a required integration/E2E scenario.
- UI cannot contain the domain or safety rules as its only implementation.
- A future Laravel service is additive and optional; it cannot become necessary
  to open the app, inspect history, or run the core loop.
- Server-only AI and sync work require a separate ADR, consent model, and data
  minimization review.

## Alternatives rejected

- **Laravel-first API:** premature for one local owner and creates availability
  and privacy costs without supporting P0.
- **Web/PWA-first:** weaker fit for the intended native session, haptic, audio,
  notification, and physical-iPhone workflow.
- **AI-first generation:** cannot provide the deterministic, explainable safety
  boundary required by the product.
