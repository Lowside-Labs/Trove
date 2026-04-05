# Repository Guidelines

## Project Structure & Module Organization

Trove is a TypeScript CLI with source under `src/`.

- `src/cli.ts`: CLI entrypoint.
- `src/commands/`: command handlers such as `sync`, `search`, `stats`, and `init`.
- `src/sources/`: source adapters and parsing logic. X bookmark and like logic lives in `x.ts`; related tests live beside it in `x.test.ts` and `x.sync.test.ts`.
- `src/auth/`: browser session and cookie-loading code.
- `src/db/`: SQLite access, schema, and DB tests.
- `src/core/`: shared filesystem and raw-output helpers.

Keep tests close to the code they cover using `*.test.ts`.

## Build, Test, and Development Commands

- `npm install`: install dependencies.
- `npm run build`: bundle the CLI into `dist/` with `tsup`.
- `npm run dev -- <command>`: run the CLI in development, for example `npm run dev -- sync demo`.
- `npm test`: run the Vitest suite.
- `npm run typecheck`: run `tsc --noEmit`.

Trove targets Node 22+. If the default local Node version is newer, `better-sqlite3` may require rerunning tests under Node 22.

Before opening a PR, run `npm test` and `npm run typecheck` under a compatible Node version.

## Coding Style & Naming Conventions

Use TypeScript with ESM imports and 2-space indentation consistent with the existing codebase.

- Prefer `camelCase` for variables and functions.
- Use `PascalCase` for interfaces and types.
- Keep files focused and name them by responsibility, for example `database.ts`, `chromium.ts`, `x.ts`.
- Co-locate narrow test-only exports under `__internal` when a small seam is needed.

No formatter or linter is currently configured, so match the surrounding style carefully.

## Command UX Defaults

Trove is a user-facing CLI. Long-running commands should not feel silent.

- Prefer the shared progress primitives in `src/core/progress.ts` over ad hoc logging.
- Use `TaskDashboardRenderer` with structured progress events for commands that may take noticeable time.
- Prefer the shared command report contract in `src/core/output.ts` over command-specific summary formatting.
- Commands that mutate archive state should run the shared post-processing hook in `src/core/archive.ts` rather than calling vault generation directly.
- Reuse the shared vault summary section builder when reporting generated archive artifacts.
- When adding a new source or mode, extend metadata in `src/sources/index.ts` and derive help text or validation from the registry instead of hardcoding strings elsewhere.

## Testing Guidelines

Vitest is the test framework. Favor targeted unit and mocked integration tests over live network or browser dependencies.

- Name tests `*.test.ts`.
- Add regression tests for parsing, sync cursor flow, and cleanup behavior when fixing bugs.
- Mock Playwright, fetch, and browser/session code for X sync tests rather than calling live services.
- Prefer source-specific parsing tests for `x`, `substack`, `github`, and `hn` over live-service coverage.

## Commit & Pull Request Guidelines

Recent commits use short, imperative subjects, for example:

- `Fix X bookmark sync regressions`
- `Refresh README overview`

Keep commits scoped to one concern. For pull requests, include:

- a short summary of behavior changes
- test results (`npm test`, `npm run typecheck`)
- linked issue or review context when relevant

## Security & Configuration Tips

Do not commit real cookies, tokens, or raw personal bookmark payloads. If you need fixtures for X responses, sanitize them first and keep only the fields required by the test.
