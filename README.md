# Trove

![Trove repository artwork](assets/trove-thumbnail.jpg)

You've been building a personal knowledge base for years, but it's invisible to your LLM.

Every tweet you bookmarked. Every Substack post you saved for later. Every GitHub repo you starred at 2am. Every Hacker News thread you favorited, meaning to come back to. Every Claude conversation where you worked through a hard problem.

**Trove pulls all of it into one local folder and makes it visible to your AI.**

Open it in Claude Code and start asking:

> *What have I been reading about local-first architecture?*
> *Which authors show up most across my bookmarks and likes?*
> *Summarize what I saved about AI coding tools this month.*

Your AI finally knows what you know.

## Quick Start

```bash
curl -fsSL https://raw.githubusercontent.com/Lowside-Labs/Trove/main/install.sh | bash

# Create a visible workspace instead of the default ~/.trove
trove init --path ~/Trove

# Trove remembers that workspace for future commands
trove sync x --browser chrome --limit 20

# Open the workspace in Claude Code
cd ~/Trove && claude
```

If you prefer the default hidden location, omit `--path ~/Trove` and Trove will use `~/.trove`.
The installer currently expects `Node 22+` to already be installed.

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

| Source | Modes | Auth method | Notes |
| --- | --- | --- | --- |
| `x` | `bookmarks`, `likes` | Chromium cookie reuse | macOS only today |
| `substack` | `saved`, `likes` | Chromium cookie reuse | macOS only today |
| `github` | `stars` | Chromium cookie reuse | macOS only today |
| `hn` | `favorites`, `favorite-comments` | public web | no browser needed |
| `claude` | chat export | live CDP session | attach to running browser |
| `chatgpt` | chat export | live CDP session | attach to running browser |

## Commands

The installed CLI name is `trove`.

| Command | What it does |
| --- | --- |
| `trove init` | Create an AI-ready workspace and initialize the database |
| `trove sync <source>` | Import content from a source into the workspace |
| `trove hydrate` | Fetch readable content for external links and write markdown files |
| `trove search <query>` | Search indexed items with SQLite FTS5 |
| `trove stats` | Show counts and freshness by source |
| `trove index` | Regenerate `INDEX.md`, `AGENTS.md`, and `CLAUDE.md` manually |

## Installation

Recommended:

```bash
curl -fsSL https://raw.githubusercontent.com/Lowside-Labs/Trove/main/install.sh | bash
```

The installer:

- downloads the current `main` branch from GitHub
- installs Trove under `~/.local/share/trove` by default
- links the `trove` binary into `~/.local/bin`

If `~/.local/bin` is not on your `PATH`, the installer tells you what to add.

Manual install from source is still available if needed:

```bash
git clone https://github.com/Lowside-Labs/Trove.git
cd Trove
npm install
npm run build
node dist/cli.js --help
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
- If `npm test` fails with a `better-sqlite3` native-module mismatch, verify that you are using Node 22 as declared in `package.json`
- If `claude` or `chatgpt` sync fails to attach, confirm that Chromium is already running with remote debugging enabled and that `--cdp-url` is correct

## Development

```bash
npm install
npm run typecheck
npm test
```

If your default local Node version is newer than 22, run the test suite under Node 22 to avoid `better-sqlite3` ABI issues.

For a faster local CLI loop, use the repo-scoped dev wrapper:

```bash
# Creates or reuses .tmp/local-dev/workspace
npm run dev:local -- sync substack

# See the isolated workspace and config paths
npm run dev:local -- where

# Reset the local dev workspace and remembered browser choices
npm run dev:local -- reset
```

`npm run dev:local` keeps your real `HOME` so Chromium cookies still resolve, but isolates `XDG_CONFIG_HOME` and the Trove workspace under `.tmp/local-dev/` for repeatable testing.
