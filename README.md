# Restore

Restore is a local-first personal iPhone app that answers “What does my body
need today?” with a safe, deterministic, guided mobility session.

Phase 0 is complete. The repository now contains the **Phase 1 Expo application
shell** and its approved product and engineering guardrails.

## Canonical documentation

- [Product roadmap](docs/product/restore-roadmap.md)
- [First-release scope](docs/product/first-release-scope.md)
- [Safety policy](docs/safety/safety-policy.md)
- [Generator invariants](docs/safety/generator-invariants.md)
- [Body-region taxonomy](docs/content/body-region-taxonomy.md)
- [Exercise-content contract](docs/content/exercise-schema.md)
- [P0 data definitions](docs/architecture/data-definitions.md)
- [Architecture decisions](docs/architecture/adr/)
- [Phase 1 handoff](docs/architecture/phase-1-handoff.md)
- [Development setup](docs/development/setup.md)
- [Dependency decisions](docs/development/dependencies.md)
- [GitHub CI](docs/development/ci.md)
- [Phase 1 checklist](docs/releases/phase-1-checklist.md)
- [Repository instructions](AGENTS.md)

## Phase 0 status

Phase 0 was approved and completed on 28 August 2026. Restore is ready for the
Phase 1 identity gate and application bootstrap. Qualified clinical review is
required before Restore is used as a daily-use build, but does not block Phase 1
engineering.

## Development

Install and verify the pinned foundation:

```bash
corepack enable pnpm
pnpm install --frozen-lockfile
pnpm doctor
pnpm verify
```

Individual checks are available as:

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm content:validate
pnpm build:check
```

Start Metro for the development client with `pnpm start`. The local BOOT-001
foundation is complete; EAS login/project linking and the signed iPhone build
remain pending until the required accounts are ready.
