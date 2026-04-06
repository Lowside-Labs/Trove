# Trove Desktop App — Setup Plan

## Decisions

### 1. Build Tooling

**Options:**

| Option                               | What it is                               | Pros                                                             | Cons                                                         |
| ------------------------------------ | ---------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------ |
| **electron-vite + electron-builder** | Vite-native build tool + mature packager | Best DX, single config file, fast HMR, feels like normal Vite    | Two tools to learn, electron-builder is community-maintained |
| **Electron Forge (Vite plugin)**     | Official all-in-one from Electron team   | First-party, unified pipeline (build + package + sign + publish) | Vite plugin still experimental, more config boilerplate      |

**Leaning toward:** `electron-vite` + `electron-builder`. Vite-native DX, stable, works with pnpm workspaces. Can revisit Forge if their Vite plugin stabilizes.

**Blocker:** electron-vite v5.0 supports Vite 5/6/7 only. Vite 8 support is WIP ([issue #894](https://github.com/alex8088/electron-vite/issues/894)). Use **Vite 7** until support lands.

### 2. Electron Version

Pick the latest stable Electron release at setup time. Download its `electron-api.json` from GitHub releases as a version-pinned API reference.

### 3. Renderer Framework

React + TypeScript — consistent with the rest of the Trove monorepo.

**Routing constraint:** Only `HashRouter` works in production (Electron loads files from filesystem, not a web server).

### 4. Package Structure

Add as a new package in the pnpm workspace: `packages/desktop` (or `apps/desktop`).

---

## Security Defaults

These are non-negotiable for any new Electron app:

- `nodeIntegration: false`
- `contextIsolation: true`
- `sandbox: true`
- Use `contextBridge.exposeInMainWorld()` in preload — only expose the minimum API surface
- `ipcMain.handle` / `ipcRenderer.invoke` for async IPC (never `sendSync`)
- CSP headers in renderer (`default-src 'self'; script-src 'self'`)
- Electron Fuses: disable `RunAsNode`, `NodeOptions`, `NodeCliInspect`; enable ASAR integrity

---

## Publishing & Distribution

### Code Signing

| Platform | What's needed                                                | Tool                                       |
| -------- | ------------------------------------------------------------ | ------------------------------------------ |
| macOS    | Apple Developer certificate ($99/yr) + notarization          | `@electron/osx-sign`, `@electron/notarize` |
| Windows  | EV certificate (Azure Trusted Signing or DigiCert KeyLocker) | `@electron/windows-sign`                   |

### Distribution Channels

| Platform | Format                      | Notes                                        |
| -------- | --------------------------- | -------------------------------------------- |
| macOS    | DMG (direct), Homebrew Cask | Mac App Store later if needed                |
| Windows  | NSIS installer              | Standard approach                            |
| Linux    | AppImage                    | Universal, supports auto-updates, zero infra |

### Auto-Updates

Use `electron-updater` (from electron-builder) publishing to GitHub Releases. Works on all 3 platforms, supports staged rollouts and differential updates.

### CI/CD

GitHub Actions with matrix strategy (`macos-latest`, `windows-latest`, `ubuntu-latest`). Store signing certificates as base64 in GitHub Actions secrets.

---

## AI Agent Tooling

### Documentation Access

| Tool                                 | Purpose                                              | Setup                                               |
| ------------------------------------ | ---------------------------------------------------- | --------------------------------------------------- |
| **Context7 MCP** (`find-docs` skill) | Fetch up-to-date Electron docs in-context            | Already available — add "use context7" to prompts   |
| **`electron-api.json`**              | Version-pinned, machine-readable API schema          | Download from Electron GitHub release, keep in repo |
| **electron-mcp-server**              | Runtime debugging — screenshots, DOM inspection, CDP | `npx -y electron-mcp-server`                        |

### CLAUDE.md Additions

Document in the project CLAUDE.md:

- Process boundary map (which directories = main/renderer/preload)
- IPC channel naming conventions and typed channel definitions
- Build/dev/package commands
- Target Electron version

---

## Native Modules (better-sqlite3)

**Architecture decision:** Load better-sqlite3 directly in Electron's main process via trove-core. This is the standard pattern used by Signal Desktop, VSCode, and most production Electron apps. No sidecar process needed.

```
renderer → preload → main → trove-core → better-sqlite3
```

**Rebuild approach:** `@electron/rebuild` downloads prebuilt binaries for the target Electron version/platform/arch. better-sqlite3 publishes 91+ Electron prebuilt binaries. No C++ toolchain required on standard platforms.

The rebuild script (`apps/desktop/scripts/rebuild-native.mjs`) must NOT set `buildFromSource: true` or `force: true` — these force compilation from source, which requires Xcode CLT on macOS and causes unnecessary contributor friction. Without these flags, prebuilt binaries are downloaded instead.

**Verified working:** Electron 41.1.1 + better-sqlite3 12.8.0 on darwin-arm64 — module loads, queries work, FTS5 works.

---

## Scaffolding Steps

1. `npm create @quick-start/electron@latest packages/desktop -- --template react-ts`
2. Wire into pnpm workspace (`pnpm-workspace.yaml`)
3. Configure `electron.vite.config.ts` (single file: main + preload + renderer)
4. Configure `electron-builder.yml` (installers, signing, auto-update)
5. Add dev/build/package scripts to `package.json`
6. Set up IPC types in `src/shared/channels.ts`
7. Set security defaults in `BrowserWindow` config and preload
8. Add GitHub Actions workflow for cross-platform builds

---

## App Size Expectations

Electron bundles Chromium (~50MB) + Node.js (~15MB). A minimal app is ~80-100MB. Key optimizations:

- Bundle main process with Vite (eliminates shipping `node_modules`)
- ASAR packaging (on by default)
- Filter source maps, test files, and docs from build output
- Build per-architecture (arm64/x64) rather than universal binaries
