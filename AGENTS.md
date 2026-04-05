# Repository Guidelines

## Project Structure & Module Organization

Trove is a TypeScript CLI with source under `src/`.

- `src/cli.ts`: CLI entrypoint.
- `src/commands/`: command handlers such as `sync`, `search`, `stats`, and `init`.
- `src/sources/`: source adapters and parsing logic. X bookmark logic lives in `x.ts`; related tests live beside it in `x.test.ts` and `x.sync.test.ts`.
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

Before opening a PR, run `npm test` and `npm run typecheck`.

## Coding Style & Naming Conventions

Use TypeScript with ESM imports and 2-space indentation consistent with the existing codebase.

- Prefer `camelCase` for variables and functions.
- Use `PascalCase` for interfaces and types.
- Keep files focused and name them by responsibility, for example `database.ts`, `chromium.ts`, `x.ts`.
- Co-locate narrow test-only exports under `__internal` when a small seam is needed.

No formatter or linter is currently configured, so match the surrounding style carefully.

## Testing Guidelines

Vitest is the test framework. Favor targeted unit and mocked integration tests over live network or browser dependencies.

- Name tests `*.test.ts`.
- Add regression tests for parsing, sync cursor flow, and cleanup behavior when fixing bugs.
- Mock Playwright, fetch, and browser/session code for X sync tests rather than calling live services.

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
