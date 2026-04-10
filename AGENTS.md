# Repository Guidelines

Trove turns saved web material and AI conversations into a local knowledge workspace that agents can search, hydrate, and browse without sending data to a cloud service.

## Essentials

- This is a `pnpm` workspace targeting Node 22+.
- Main packages:
  - `packages/trove-core/`: shared archive engine, source adapters, DB layer, workspace services, hydration, and progress/output primitives.
  - `packages/trove-contracts/`: shared Zod-backed contracts and types for CLI, core, and desktop.
  - `packages/trove-cli/`: the `trove` CLI entrypoint and command wiring.
  - `apps/desktop/`: Electron desktop app built on `trove-core` and `trove-contracts`.
- Trove is local-first. Do not add cloud dependencies, remote sync, or data-export behavior unless explicitly requested.
- Never commit real cookies, tokens, or unsanitized personal payloads.

## Project Shape

- `packages/trove-cli/src/cli.ts`: CLI entrypoint.
- `packages/trove-cli/src/commands/`: user-facing commands like `init`, `sync`, `hydrate`, `search`, and `stats`.
- `packages/trove-core/src/services/`: higher-level workspace, sync, search, stats, and library services.
- `packages/trove-core/src/sources/`: source adapters for X, Instagram, Substack, GitHub, Hacker News, Claude, and ChatGPT.
- `packages/trove-core/src/db/`: SQLite access and schema.
- `packages/trove-core/src/core/`: shared archive, hydration, paths, raw output, vault, and progress helpers.
- `packages/trove-core/src/auth/`: browser session, Chromium profile, Chrome tab, and CDP helpers.
- `packages/trove-contracts/src/`: shared contracts for items, sync, reports, workspace, IPC, desktop, and browser metadata.
- `apps/desktop/src/main/`: Electron main process and IPC handlers.
- `apps/desktop/src/renderer/`: React renderer UI.

## Development Commands

- `pnpm install`
- `pnpm build`
- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm format:check`
- `pnpm dev -- <command>` for CLI development
- `pnpm dev:local -- <command>` for isolated local CLI workflows
- `pnpm --filter trove-desktop dev` for desktop development

Before opening a PR, run `pnpm test` and `pnpm typecheck` with Node 22.

## Coding Rules

- Use TypeScript with ESM imports and match the surrounding 2-space style.
- Prefer `camelCase` for values/functions and `PascalCase` for types/interfaces.
- Keep files focused and named by responsibility.
- Keep tests close to the code they cover using `*.test.ts`.
- Reuse shared contracts and core services instead of duplicating types or archive logic in CLI or desktop layers.

## CLI And Archive Conventions

- Trove is a user-facing CLI; long-running commands should show progress.
- Prefer shared progress helpers in `packages/trove-core/src/core/progress.ts`.
- Prefer shared command report/output helpers over command-specific summary formatting.
- Commands that mutate archive state should go through the shared archive post-processing flow.
- When adding or changing a sync source, update the source registry in `packages/trove-core/src/sources/index.ts`; do not hardcode supported-source lists elsewhere.

## Testing Guidance

- Use Vitest.
- Favor targeted unit tests and mocked integration tests over live network or browser dependencies.
- Add regression coverage for parsing, sync cursor/state flow, cleanup behavior, and archive generation when fixing bugs.
- Mock Playwright, fetch, browser cookies, and Chrome/CDP integrations for source sync tests.

## Frontend Note

- Prefer instant hover states. Do not add hover transitions or eased hover animations unless explicitly requested.

## Commit And PR Guidance

- Keep commits scoped to one concern with short, imperative subjects.
- PRs should include a brief behavior summary, relevant issue/review context, and the commands run to verify the change.
