# Package Guide

`trove-contracts` holds the shared schemas, types, and report/progress contracts used across `trove-core`, the CLI, and the desktop app.

## Important Paths

- `src/index.ts`: package export surface.
- `src/item.ts`: archive item shapes.
- `src/sync.ts`: sync options, results, and source-facing contracts.
- `src/report.ts` and `src/progress.ts`: shared command report and progress event types.
- `src/workspace.ts`, `src/browser.ts`, `src/ipc.ts`, `src/desktop.ts`: cross-surface contracts.

## Rules

- Keep this package small, stable, and dependency-light.
- Prefer shared schemas/types here when multiple packages need the same contract.
- Avoid runtime behavior and package-specific business logic in this package.
- Changes here can ripple into CLI, core, and desktop consumers, so keep compatibility in mind.
- Keep exports intentional and avoid dead or duplicate contract definitions.

## Commands

- `pnpm --filter trove-contracts test`
- `pnpm --filter trove-contracts typecheck`
- `pnpm --filter trove-contracts build`

## Testing

- Add focused tests only where schemas or contract behavior need verification.
- Keep naming and shape changes deliberate because downstream packages depend on them.
