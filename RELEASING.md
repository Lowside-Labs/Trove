# Releasing

Trove uses `release-it` for low-friction releases.

## Requirements

- release from a clean `main` branch checkout
- `gh auth login` completed locally, or `GITHUB_TOKEN` set
- `pnpm install` already run

## Command

Choose one of:

```bash
pnpm release patch
pnpm release minor
pnpm release major
```

For the very first tagged release, use the exact version instead:

```bash
pnpm release 0.1.0
```

To preview without changing anything:

```bash
pnpm release patch --dry-run
```

## What It Does

The release command:

- runs `pnpm check`
- bumps `packages/trove-cli/package.json`
- updates `CHANGELOG.md`
- commits the release
- creates a Git tag like `v0.1.1`
- pushes the commit and tag
- creates a GitHub release
