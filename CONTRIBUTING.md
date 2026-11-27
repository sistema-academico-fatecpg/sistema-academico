# Contributing to sistema-academico

Thank you for contributing! This document explains how to propose changes,
report issues, and prepare pull requests for this project.

## Project conventions

- Package manager: **pnpm** (v12.17.0), lockfile `pnpm-lock.yaml`.
- Linter and formatter: **Biome** (`@biomejs/biome`).
- Type checker: **TypeScript** (`tsc --noEmit`).
- Commit messages: **Conventional Commits**.

## Local commands

Install dependencies:

```bash
pnpm install --frozen-lockfile
```

Format and lint (safe fixes applied):

```bash
pnpm check:fix
```

Verify lint and formatting without modifying files:

```bash
pnpm check
```

Typecheck (no build artifacts emitted):

```bash
pnpm typecheck
```

Run tests:

```bash
pnpm test:run
```

## Branch and pull request workflow

1. Create a feature branch from `main` (or `develop`).
2. Make your changes and run `pnpm check:fix` before committing.
3. Commit using [Conventional Commits](#conventional-commits).
4. Open a pull request against `main`.
5. Keep the PR focused on a single concern and update the linked issue.

GitHub Actions runs Conventional Commits validation, Biome formatting/linting,
and TypeScript typecheck on every pull request and push. All CI checks are
read-only: CI does not reformat files, create commits, or push to your branch.
Formatting must be applied locally before committing (`pnpm check:fix`), which
the `pre-commit` hook enforces after `pnpm hooks:install`.

## Conventional Commits

Commit messages must follow:

```
<type>[optional scope]: <description>
```

Supported types:

- `feat` — a new feature
- `fix` — a bug fix
- `docs` — documentation only changes
- `style` — formatting, missing semicolons, etc. (no code change)
- `refactor` — code change that neither fixes a bug nor adds a feature
- `perf` — performance improvements
- `test` — adding or correcting tests
- `build` — changes to the build system or dependencies
- `ci` — changes to CI configuration or scripts
- `chore` — routine tasks (e.g. automatic formatting)
- `revert` — reverting a previous commit

Example: `feat(auth): add password reset flow`

Breaking changes are indicated by appending `!` after the type/scope:
`feat!: change authentication API`.

## Issues and pull requests

- Use the issue templates under `.github/ISSUE_TEMPLATE/` (bug report or
  feature request). Blank issues are disabled.
- Use the pull request template at `.github/pull_request_template.md`.
- Link related issues in the PR description.
- Formatting is always applied locally with `pnpm check:fix`; GitHub Actions
  only verifies it (for fork and non-fork pull requests alike).

## Formatting and CI

The CI workflows share the same commands as the git hooks through
`.github/hooks/checks.sh`, but they are read-only: they run `pnpm format:check`,
`pnpm check`, `pnpm typecheck`, tests, build, and the security checks without
modifying files or pushing commits. Install the hooks once with
`pnpm hooks:install` so `pre-commit` applies Biome fixes and validates the
commit message before each commit.
