# Restore

Restore is a local-first personal iPhone app that answers “What does my body
need today?” with a safe, deterministic, guided mobility session.

The repository is currently at **Phase 0: product definition and guardrails**.
There is intentionally no Expo application yet.

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
- [Repository instructions](AGENTS.md)

## Phase 0 status

The engineering guardrails and normalized scope are defined. Phase 0 is ready
for owner scope approval. Qualified clinical review is required before Restore
is used as a daily-use build, but is not required to begin Phase 1 engineering.

## Command contract

Phase 1 must implement these commands before feature work starts:

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm content:validate
pnpm verify
```

Until the application shell exists, Phase 0 validation is document review and
repository consistency checking only.
