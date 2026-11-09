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
and TypeScript typecheck on every pull request and push. Biome may
automatically format your branch and push a commit named
`chore: automatic lint from Github Actions` to the PR's head branch.

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
- Automatic formatting is performed by GitHub Actions on pull requests from
  non-fork branches; fork pull requests must be formatted locally with
  `pnpm check:fix` before pushing.

## Automatic formatting by GitHub Actions

The CI workflow runs `pnpm check:fix` (Biome safe fixes and formatting). If
tracked files changed, a commit is created with the message
`chore: automatic lint from Github Actions` using the
`github-actions[bot]` identity and pushed to the branch being checked. No
commit is created when nothing changed. Fork pull requests and pushes to the
default branch are not auto-pushed; contributors must apply formatting locally.
