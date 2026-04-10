# Package Guide

`trove-cli` is the thin user-facing CLI layer for Trove. Keep behavior here focused on command wiring, terminal UX, and delegating archive logic to `trove-core`.

## Important Paths

- `src/cli.ts`: root command setup, global options, and workspace resolution.
- `src/commands/`: top-level commands such as `init`, `sync`, `hydrate`, `search`, `stats`, and `index`.
- `src/core/`: CLI-specific terminal output, reports, and progress rendering.

## Rules

- Prefer importing business logic from `trove-core` instead of reimplementing it in the CLI.
- Keep command handlers small: parse flags, call shared services, render output, and exit cleanly on errors.
- Long-running commands should use the shared progress/dashboard primitives instead of ad hoc logging.
- Command summaries should go through shared output/report helpers.
- If a command mutates archive state, keep the shared post-processing flow intact so workspace artifacts stay current.
- When adding a sync source or mode, update registry-driven metadata rather than hardcoding source lists in commands.

## Commands

- `pnpm --filter trove test`
- `pnpm --filter trove typecheck`
- `pnpm --filter trove build`
- `pnpm dev -- <command>`
- `pnpm dev:local -- <command>`

## Testing

- Keep tests next to the CLI code they cover with `*.test.ts`.
- Prefer mocked integration tests over live browser or network behavior.
- Add regression coverage for command parsing, output formatting, and sync flow wiring when fixing bugs.
