# Trove

![Trove repository artwork](assets/trove-thumbnail.jpg)

Trove turns the things you save on the web into a local knowledge workspace for AI agents.

Sync bookmarks, likes, stars, favorites, articles, and chats. Trove builds a folder your agent can actually use:

- `AGENTS.md` for Codex and other AGENTS-aware tools
- `CLAUDE.md` for Claude Code
- `INDEX.md` for a fast human and agent overview
- Markdown content under `content/` for article-style browsing

Use it to ask questions like:

- What have I been saving about local-first software?
- Which authors or publications recur across my saved items?
- Summarize the articles I saved recently about AI coding tools.

## Quick Start

The fastest agent-first path is:

```bash
curl -fsSL https://raw.githubusercontent.com/Lowside-Labs/Trove/main/install.sh | bash

# Create a visible workspace instead of the default ~/.trove
trove init --path ~/Trove

# Work inside the workspace so Trove auto-detects it
cd ~/Trove

# Sync a source into that workspace
trove sync x --browser chrome --limit 20

# Open the workspace in Claude Code
claude
```

If you prefer the default hidden location, omit `--path ~/Trove` and Trove will use `~/.trove`.
The installer currently expects `Node 22+` to already be installed.

## Table of Contents

- [How It Works](#how-it-works)
- [What Gets Created](#what-gets-created)
- [Using It With Agents](#using-it-with-agents)
- [Browsing In Obsidian](#browsing-in-obsidian)
- [Supported Sources](#supported-sources)
- [Commands](#commands)
- [Installation](#installation)
- [Storage and Path Options](#storage-and-path-options)
- [Limitations](#limitations)
- [Troubleshooting](#troubleshooting)
- [Development](#development)

## How It Works

1. `trove init` creates a workspace.
2. `trove sync <source>` imports saved material into SQLite and raw artifacts.
3. Trove refreshes `INDEX.md`, `AGENTS.md`, and `CLAUDE.md` automatically after sync and hydrate runs.
4. You open that folder in Claude Code, Codex, or another tool and ask questions over your own material.

Optional:

- `trove hydrate` fetches article-style pages and writes markdown under `content/`
- `trove search` lets you inspect results directly from the CLI

## What Gets Created

If you initialize a visible workspace such as `~/Trove`, the layout looks like this:

```text
~/Trove/
  AGENTS.md
  CLAUDE.md
  INDEX.md
  content/
  data/
    trove.db
  raw/
  index/
  logs/
```

What these files are for:

- `AGENTS.md`: canonical instructions for AGENTS-aware tools
- `CLAUDE.md`: Claude Code entry point that imports `AGENTS.md`
- `INDEX.md`: source counts, recent items, top authors, and suggested questions
- `content/`: markdown for hydrated articles and exported chats
- `data/trove.db`: local SQLite archive and FTS5 search index
- `raw/`: compact source-native payloads for inspection and debugging

## Using It With Agents

The workspace is designed to be the handoff point.

### Claude Code

```bash
cd ~/Trove
claude
```

Claude Code reads `CLAUDE.md`, which imports `AGENTS.md`.

### Codex and other AGENTS-aware tools

Open the workspace folder and start from:

- `AGENTS.md` for instructions
- `INDEX.md` for the current snapshot of what is in the archive

### Example prompts

- What have I been saving about distributed systems in the last 6 months?
- Summarize my recent Substack likes about local-first tools.
- Find items that mention SQLite, FTS, or search infrastructure.
- Which authors show up most often across my saved material?

## Browsing In Obsidian

Trove also works as a lightweight Obsidian-friendly workspace:

- Open the same workspace folder in Obsidian
- Start from `INDEX.md`
- Browse `content/` markdown files with YAML frontmatter

This is strongest after running hydration:

```bash
cd ~/Trove
trove hydrate --limit 50
```

Current limitation: `content/` is best for article-style pages and exported chats today. Native pages from hosts such as X, GitHub, Claude, ChatGPT, and Hacker News are not fully converted into note-per-item markdown yet.

## Supported Sources

| Source | Modes | Auth method | Status | Notes |
| --- | --- | --- | --- | --- |
| `x` | `bookmarks`, `likes` | Chromium cookie reuse | Working | macOS only for cookie-backed sync today |
| `substack` | `saved`, `likes` | Chromium cookie reuse | Working | likes include posts and notes/comments |
| `github` | `stars` | Chromium cookie reuse | Working | authenticated stars page parsing |
| `hn` | `favorites`, `favorite-comments` | public web | Working | no browser session required |
| `claude` | chat export | live CDP session | Working | requires a running Chromium instance with remote debugging |
| `chatgpt` | chat export | live CDP session | Working | requires a running Chromium instance with remote debugging |

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

Common patterns:

```bash
# Create a workspace here
trove init --here

# Create a workspace somewhere specific
trove init --path ~/Trove

# Sync from anywhere into a specific workspace
trove --home ~/Trove sync substack --browser chrome

# Once you are inside the workspace, Trove auto-detects it
cd ~/Trove
trove search 'tags:bookmark'
trove stats
```

## Storage and Path Options

Trove supports three useful modes:

- Visible workspace: `trove init --path ~/Trove`
- Current directory workspace: `trove init --here`
- Default hidden workspace: `trove init` which uses `~/.trove`

Recommendation:

- Use `~/Trove` if you want to open it directly in Claude Code or Obsidian
- Use `--here` for project-specific research or a temporary working set
- Use `~/.trove` only if you prefer app-style hidden storage

If you are not inside the workspace, point commands at it with `--home <path>`.

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
- Seamless Chromium cookie reuse is currently implemented only on macOS
- `chrome` and `dia` are verified for cookie-backed sync
- `brave` and `arc` are detected but still experimental
- Some sources do not expose true saved or liked timestamps, so Trove stores the closest source-native timestamp available
- Hydration currently targets external article-style links rather than every native page type

## Troubleshooting

- If cookie-backed sync says no cookies were found, confirm that you are logged into the target service in the selected browser profile
- If a browser-backed source fails on Linux or Windows, that is expected today; seamless cookie reuse is only implemented on macOS
- If `npm test` fails with a `better-sqlite3` native-module mismatch, verify that you are using Node 22 as declared in `package.json`
- If `claude` or `chatgpt` sync fails to attach, confirm that Chromium is already running with remote debugging enabled and that `--cdp-url` is correct

## Development

```bash
npm install
npm run typecheck
npm test
```

If your default local Node version is newer than 22, run the test suite under Node 22 to avoid `better-sqlite3` ABI issues.
