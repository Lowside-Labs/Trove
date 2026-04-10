# Package Guide

`trove-core` is the shared Trove engine. It owns workspace initialization, sync orchestration, source adapters, hydration, SQLite access, and shared archive/report behavior used by the CLI and desktop app.

## Important Paths

- `src/index.ts`: public package surface; keep exports intentional.
- `src/services/`: higher-level workspace, sync, search, stats, and library operations.
- `src/sources/`: source adapters and supported-source registry.
- `src/db/`: SQLite access and schema.
- `src/core/`: archive generation, hydration, paths, raw capture, vault output, and progress helpers.
- `src/auth/`: Chromium profile, Chrome tab, and CDP helpers.

## Rules

- Treat this package as the source of truth for archive behavior shared across surfaces.
- Reuse existing services and helpers before adding new layers or duplicate utilities.
- Keep source support registry-driven; avoid scattering supported-source knowledge across packages.
- Preserve local-first behavior. Do not add cloud persistence, remote sync, or external data shipping unless explicitly requested.
- Commands or flows that change archive state should continue to run shared post-processing so generated workspace files stay in sync.
- Be careful with public exports in `src/index.ts`; avoid leaking narrow internals without a clear need.

## Commands

- `pnpm --filter trove-core test`
- `pnpm --filter trove-core typecheck`
- `pnpm --filter trove-core build`

## Testing

- Keep tests next to the code they cover with `*.test.ts`.
- Favor unit and mocked integration tests over live network or browser dependencies.
- Add regression tests for parsing, sync cursor/state handling, hydration, archive generation, and database behavior.
- Never commit real cookies, tokens, or unsanitized personal fixtures.
