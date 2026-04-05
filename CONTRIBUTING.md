# Contributing

Thanks for contributing to Trove.

## Development setup

```bash
git clone https://github.com/Lowside-Labs/Trove.git
cd Trove
npm install
```

Trove targets `Node 22+`. If your default local Node is newer, use Node 22 when running tests that load `better-sqlite3`.

## Common commands

```bash
npm run build
npm run typecheck
npm test
```

If the database tests fail with a native-module ABI mismatch, switch to Node 22 and rerun the suite.

## Project layout

- `src/commands/`: CLI commands
- `src/sources/`: source adapters and source-specific parsing
- `src/auth/`: browser and cookie-loading code
- `src/db/`: SQLite schema, persistence, and tests
- `src/core/`: shared filesystem, output, and progress helpers

## Contribution guidelines

- Keep changes scoped to one concern where possible.
- Add tests close to the code you change using `*.test.ts`.
- Prefer mocked network/browser coverage over live-service tests.
- Do not commit real cookies, tokens, personal raw payloads, or unsanitized fixtures.
- If you add a new source, document it in `README.md` and update any relevant help text.

## Pull requests

Before opening a PR:

```bash
npm run typecheck
npm test
```

Include:

- a short summary of the behavior change
- test results
- any notable caveats or follow-up work
