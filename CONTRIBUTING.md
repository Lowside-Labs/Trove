# Contributing

Thanks for contributing to Trove.

## Development setup

```bash
git clone https://github.com/Lowside-Labs/Trove.git
cd Trove
pnpm install
```

Trove targets `Node 22+`. This repo includes `.nvmrc` and `.node-version` to make that easier. If your default local Node is newer, use Node 22 when running tests that load `better-sqlite3`.

## Common commands

```bash
pnpm build
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
```

If the database tests fail with a native-module ABI mismatch, switch to Node 22 and rerun the suite.

## Release workflow

Use the repo release command rather than tagging manually:

```bash
pnpm release patch
```

See `RELEASING.md` for the full release process.

## Project layout

- `packages/trove-cli/src/commands/`: CLI commands
- `packages/trove-cli/src/sources/`: source adapters and source-specific parsing
- `packages/trove-cli/src/auth/`: browser and cookie-loading code
- `packages/trove-cli/src/db/`: SQLite schema, persistence, and tests
- `packages/trove-cli/src/core/`: shared filesystem, output, and progress helpers

## Contribution guidelines

- Keep changes scoped to one concern where possible.
- Add tests close to the code you change using `*.test.ts`.
- Prefer mocked network/browser coverage over live-service tests.
- Do not commit real cookies, tokens, personal raw payloads, or unsanitized fixtures.
- If you add a new source, document it in `README.md` and update any relevant help text.

## Pull requests

Before opening a PR:

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
```

Include:

- a short summary of the behavior change
- test results
- any notable caveats or follow-up work
