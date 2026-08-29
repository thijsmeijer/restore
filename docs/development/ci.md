# GitHub continuous integration

Restore uses GitHub Actions for repository verification. The workflow is defined
in `.github/workflows/verify.yml` and intentionally calls the same `pnpm verify`
contract used locally.

## Triggers and environment

The workflow runs for:

- pushes to `main`;
- pull requests targeting `main`; and
- explicit manual dispatches.

It uses Ubuntu 24.04, Node 24.14.0, and pnpm 10.33.2. Dependencies are installed
with `--frozen-lockfile`, and the pnpm store is cached from `pnpm-lock.yaml`.
Concurrent runs for the same workflow/ref are cancelled so obsolete commits do
not consume unnecessary runner time.

Third-party actions are pinned to immutable release commit SHAs. The workflow
token has only `contents: read`; it receives no write permission, deployment
permission, or project secret.

## Pull-request expectations

- Make changes on a narrow branch and open a pull request to `main`.
- Complete the repository pull-request template.
- Inspect the complete diff and wait for the `Verify / Verify` check.
- Do not merge a failing or cancelled check.
- UI/native changes still require the documented physical-iPhone evidence; CI
  does not replace it.
- Safety, content, and migration changes require their dedicated review evidence
  even when the generic workflow passes.

## Recommended main-branch ruleset

Configure a GitHub ruleset targeting `main` with:

- deletion and force-push blocked;
- pull requests required before merging;
- `Verify / Verify` required and the branch required to be up to date;
- conversations resolved before merging; and
- administrator bypass limited to emergencies.

For a one-owner repository, requiring an approving review can prevent the owner
from merging their own pull request. Keep the approval count at zero until a
second trusted reviewer exists, while retaining the pull-request and status-check
requirements.

## No secrets in verification

The verification workflow does not need Expo, Apple, or EAS credentials. Future
signed-build or deployment workflows must be separate, environment-protected,
and approved through a new delivery decision before secrets are introduced.
