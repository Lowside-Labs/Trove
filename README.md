# Trove

**A second brain from your digital life.**

Everyone's talking about building a [second brain](https://x.com/karpathy/status/1908189593508421654) — a personal knowledge base you can hand to an AI agent. The problem is that yours already exists. It's just scattered — locked behind logins, siloed across platforms, and invisible to every AI tool you use.

Trove pulls all of it into one local folder with a single CLI. Then you point an AI agent at it.

### Sync

```bash
trove sync x          # X bookmarks + likes
trove sync claude     # Claude chat exports
trove sync chatgpt    # ChatGPT chat exports
trove sync substack   # Substack saves + likes
trove sync github     # GitHub stars
trove sync hn         # Hacker News favorites
```

Everything lands in one local folder — SQLite database + markdown files. No cloud, no account.

### Ask

Open the folder in Claude Code, Codex, or any AI agent:

- **"What patterns show up across everything I've saved?"** — discover recurring interests you never explicitly tracked
- **"Find everything related to [topic] across all my sources"** — get a synthesis across bookmarks, articles, and your own AI conversations in seconds
- **"Draft something based on what I've been reading"** — get a first draft grounded in your actual sources, not generic training data
- **"What repos or tools have I saved that are relevant to what I'm building?"** — get recommendations from your own history

## Get Started

```bash
curl -fsSL https://raw.githubusercontent.com/Lowside-Labs/Trove/main/install.sh | bash
trove init
trove sync x
trove sync claude
cd ~/.trove && claude
```

That's it. Five commands from zero to asking your AI about everything you've saved.

Requires `Node 22+`.

If you use `nvm` or `mise`/`asdf`-style tooling that reads version files, this repo also includes `.nvmrc` and `.node-version`.

## How It Works

1. `trove init` creates a workspace with a SQLite database and agent guide files.
2. `trove sync <source>` imports your saved content.
3. Open the workspace folder in Claude Code, Codex, or Obsidian.

Optional: `trove hydrate` fetches linked articles and writes them as markdown. `trove search` queries the archive from the CLI.

```text
~/Trove/
  CLAUDE.md        # Claude Code reads this on launch
  AGENTS.md        # Codex and other agent tools read this
  INDEX.md         # snapshot of your collection
  content/         # hydrated articles and exported chats
  data/trove.db    # SQLite archive with FTS5 search
  raw/             # source-native payloads
```

## Supported Sources

| Source      | Modes                            | Auth method              | Notes                                                                                                    |
| ----------- | -------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------- |
| `x`         | `bookmarks`, `likes`             | Chromium cookie reuse    | macOS only today                                                                                         |
| `instagram` | `saved`                          | Chromium cookie reuse    | macOS only today                                                                                         |
| `substack`  | `saved`, `likes`                 | Chromium cookie reuse    | macOS only today                                                                                         |
| `github`    | `stars`                          | Chromium cookie reuse    | macOS only today                                                                                         |
| `hn`        | `favorites`, `favorite-comments` | public web               | no browser needed                                                                                        |
| `claude`    | chat export                      | active Chrome tab or CDP | macOS: prefers an open Google Chrome tab; enable `View > Developer > Allow JavaScript from Apple Events` |
| `chatgpt`   | chat export                      | active Chrome tab or CDP | macOS: prefers an open Google Chrome tab; enable `View > Developer > Allow JavaScript from Apple Events` |

## Commands

The installed CLI name is `trove`.

| Command                | What it does                                                       |
| ---------------------- | ------------------------------------------------------------------ |
| `trove init`           | Create an AI-ready workspace and initialize the database           |
| `trove sync <source>`  | Import content from a source into the workspace                    |
| `trove hydrate`        | Fetch readable content for external links and write markdown files |
| `trove search <query>` | Search indexed items with SQLite FTS5                              |
| `trove stats`          | Show counts and freshness by source                                |
| `trove index`          | Regenerate `INDEX.md`, `AGENTS.md`, and `CLAUDE.md` manually       |

## Installation

Recommended:

```bash
curl -fsSL https://raw.githubusercontent.com/Lowside-Labs/Trove/main/install.sh | bash
```

The installer:

- downloads the latest GitHub release by default
- installs Trove under `~/.local/share/trove` by default
- links the `trove` binary into `~/.local/bin`

To install a specific tagged release, set `TROVE_VERSION`, for example `TROVE_VERSION=v0.1.0`.

If `~/.local/bin` is not on your `PATH`, the installer tells you what to add.

Manual install from source is still available if needed:

```bash
git clone https://github.com/Lowside-Labs/Trove.git
cd Trove
pnpm install
pnpm build
node packages/trove-cli/dist/cli.js --help
```

## Desktop App Preview

Trove also ships a macOS desktop preview for browsing and syncing an existing Trove workspace.

- Platform: macOS on Apple Silicon (`arm64`) only for V0
- Download: [latest desktop release](https://github.com/Lowside-Labs/Trove/releases/latest)
- Install: open the `.dmg`, drag `Trove` to `Applications`, then launch it
- Workspace: run `trove init --path ~/Trove` first if you do not already have a workspace

This build is currently unsigned. On first launch, macOS may block it. If that happens:

1. Open `System Settings > Privacy & Security`
2. Find the blocked `Trove` launch notice
3. Click `Open Anyway`

To verify a downloaded release artifact:

```bash
shasum -a 256 ~/Downloads/Trove-<version>-arm64.dmg
```

## Limitations

- `Node 22+` is the supported runtime
- Chromium cookie reuse is currently implemented only on macOS
- `chrome` and `dia` are verified for cookie-backed sync
- `brave` and `arc` are detected but still experimental
- Some sources do not expose true saved or liked timestamps, so Trove stores the closest source-native timestamp available
- Hydration currently targets external article-style links rather than every native page type

## Troubleshooting

- If cookie-backed sync says no cookies were found, confirm that you are logged into the target service in the selected browser profile
- If a browser-backed source fails on Linux or Windows, that is expected today; cookie reuse is only implemented on macOS
- If `pnpm test` fails with a `better-sqlite3` native-module mismatch, verify that you are using Node 22 as declared in `package.json`
- On macOS, `claude` and `chatgpt` prefer an open Google Chrome tab. In Chrome, enable `View > Developer > Allow JavaScript from Apple Events`. If that path is unavailable, use `--cdp-url <url>` to attach manually.

## Development

```bash
pnpm install
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
```

If your default local Node version is newer than 22, run the test suite under Node 22 to avoid `better-sqlite3` ABI issues.

For a faster local CLI loop, use the repo-scoped dev wrapper:

```bash
# Creates or reuses .tmp/local-dev/workspace
pnpm dev:local -- sync substack

# See the isolated workspace and config paths
pnpm dev:local -- where

# Reset the local dev workspace and remembered browser choices
pnpm dev:local -- reset
```

`pnpm dev:local` keeps your real `HOME` so Chromium cookies still resolve, but isolates `XDG_CONFIG_HOME` and the Trove workspace under `.tmp/local-dev/` for repeatable testing.

For desktop development, the Electron app now uses the same isolated sandbox pattern:

```bash
# Launch the desktop app against .tmp/local-dev/workspace
pnpm --filter trove-desktop dev

# Force the onboarding flow in desktop dev
pnpm --filter trove-desktop dev:onboarding

# See the isolated desktop workspace and config paths
pnpm --filter trove-desktop dev:where

# Reset the isolated desktop workspace and config
pnpm --filter trove-desktop dev:reset
```

The desktop dev scripts preserve your real `HOME` for browser/session discovery, but they isolate `XDG_CONFIG_HOME` and `TROVE_HOME` under `.tmp/local-dev/` so dev runs do not overwrite the workspace remembered by the packaged app or CLI.

## Releasing

Trove uses `release-it` for lightweight release management.

```bash
pnpm release patch
pnpm release minor
pnpm release major
```

For the first tagged release, use an exact version such as `pnpm release 0.1.0`. See `RELEASING.md` for the full checklist.
