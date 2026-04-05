# Trove

![Trove repository artwork](assets/trove-thumbnail.jpg)

Trove is a local-first CLI for turning the things you save across the web into one searchable local archive. It pulls source-native data into SQLite, keeps compact raw artifacts on disk, and lets you search everything from one place.

Trove is for people who save too much from X, Hacker News, Substack, GitHub, and AI tools and want one local archive instead of five silos.

## In 10 Seconds

- Import saved content from `x`, `substack`, `github`, `hn`, `claude`, and `chatgpt`
- Generate `INDEX.md`, `AGENTS.md`, and `CLAUDE.md` in `~/.trove/`
- Hydrate external links into markdown under `~/.trove/content/`
- Use six commands: `init`, `sync`, `index`, `hydrate`, `search`, and `stats`

```bash
git clone https://github.com/Lowside-Labs/Trove.git
cd Trove
npm install
npm run build
node dist/cli.js init
node dist/cli.js sync x --browser chrome --limit 20
node dist/cli.js hydrate --limit 20
node dist/cli.js search 'tags:bookmark'
```

> [!IMPORTANT]
> Trove currently installs from source. Use `Node 22+`. Seamless Chromium cookie reuse for `x`, `substack`, and `github` is currently implemented only on macOS.

## Table of Contents

- [Quick Start](#quick-start)
- [Command Cheat Sheet](#command-cheat-sheet)
- [Supported Sources](#supported-sources)
- [Search](#search)
- [How It Works](#how-it-works)
- [Data Storage and Privacy](#data-storage-and-privacy)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [Roadmap](#roadmap)

## Quick Start

Examples below use `node dist/cli.js` because Trove is currently a source-install project.

### 1. Install

```bash
git clone https://github.com/Lowside-Labs/Trove.git
cd Trove
npm install
npm run build
node dist/cli.js --help
```

### 2. Initialize the archive

```bash
node dist/cli.js init
```

This creates `~/.trove/` and initializes the local SQLite database.

### 3. Sync a source

Pick the first path that matches what you want to import:

```bash
# X: bookmarks + likes by default
node dist/cli.js sync x --browser chrome --limit 20

# Substack: saved + likes by default
node dist/cli.js sync substack --browser chrome

# GitHub: stars
node dist/cli.js sync github --browser chrome

# Hacker News: public favorites
node dist/cli.js sync hn --user <username> --kind favorites

# Claude: attach to a running Chromium instance
node dist/cli.js sync claude --cdp-url http://127.0.0.1:9222

# ChatGPT: attach to a running Chromium instance
node dist/cli.js sync chatgpt --cdp-url http://127.0.0.1:9222
```

### 4. Search and inspect

```bash
node dist/cli.js hydrate --limit 20
node dist/cli.js index
node dist/cli.js search 'tags:bookmark'
node dist/cli.js stats
```

Every `sync` run also refreshes:

- `~/.trove/INDEX.md`
- `~/.trove/AGENTS.md`
- `~/.trove/CLAUDE.md`

## Command Cheat Sheet

The CLI name is `trove`. When running from this repository, replace `trove` with `node dist/cli.js`.

### Core commands

| Command | What it does |
| --- | --- |
| `trove init` | Create `~/.trove/` and initialize the local SQLite database |
| `trove sync <source>` | Import content from a source into the archive |
| `trove index` | Regenerate the vault catalog and agent guide files |
| `trove hydrate` | Fetch readable content for external links and write markdown files |
| `trove search <query>` | Run an SQLite FTS5 query across indexed items |
| `trove stats` | Show archive counts and freshness |

### Common defaults

- `trove sync x` runs both `bookmarks` and `likes` unless you pass `--kind`
- `trove sync substack` runs both `saved` and `likes` unless you pass `--kind`
- `trove sync hn` runs both `favorites` and `favorite-comments` unless you pass `--kind`

### Common flags

| Flag | Use |
| --- | --- |
| `--browser <browser>` | Select the Chromium browser profile source, for example `chrome` or `dia` |
| `--profile <profile>` | Select a non-default Chromium profile |
| `--kind <kind>` | Choose a source mode instead of running the default set |
| `--limit <number>` | Cap the number of imported items |
| `--user <user>` | Provide a username for public-user sources such as `hn` |
| `--cdp-url <url>` | Attach to a running browser for `claude` and `chatgpt` |
| `--headful` | Show the browser while Trove discovers an authenticated request shape |
| `--debug-raw-pages` | Keep full X GraphQL page payloads for debugging |

## Supported Sources

| Source | Modes | Auth method | Status | Notes |
| --- | --- | --- | --- | --- |
| `x` | `bookmarks`, `likes` | Chromium cookie reuse | Working | macOS only for cookie-backed sync today |
| `substack` | `saved`, `likes` | Chromium cookie reuse | Working | likes include posts and notes/comments |
| `github` | `stars` | Chromium cookie reuse | Working | authenticated stars page parsing |
| `hn` | `favorites`, `favorite-comments` | public web | Working | no browser session required |
| `claude` | chat export | live CDP session | Working | requires a running Chromium instance with remote debugging |
| `chatgpt` | chat export | live CDP session | Working | requires a running Chromium instance with remote debugging |

### Browser and platform notes

- `Node 22+` is the supported runtime
- `chrome` and `dia` are verified for cookie-backed sync
- `brave` and `arc` are detected but still experimental
- Some sources do not expose true saved or liked timestamps, so Trove stores the closest source-native timestamp available
- The first hydration pass targets external article-style links rather than every native page type

## Search

Trove exposes SQLite FTS5 search directly.

```bash
node dist/cli.js search 'tags:bookmark'
node dist/cli.js search 'tags:like'
node dist/cli.js search 'sqlite vector search'
node dist/cli.js search 'substack note'
```

Column-qualified queries such as `tags:bookmark` work because tags are indexed in the FTS table.

## How It Works

- Cookie-backed sources reuse your local authenticated Chromium session instead of asking for OAuth credentials
- On macOS, Trove decrypts the selected browser's cookies via the Keychain and replays your own session against the source's web app
- For `x`, Trove launches a short-lived Playwright session to discover the current GraphQL request shape, then paginates from plain `fetch`
- `claude` and `chatgpt` sync attach to a running Chromium instance over CDP
- `hn` sync reads public pages and does not require an authenticated browser session

## Data Storage and Privacy

By default, Trove stores data in `~/.trove/`:

```text
~/.trove/
  AGENTS.md
  CLAUDE.md
  INDEX.md
  data/
    trove.db
  raw/
  content/
  index/
  logs/
```

- The SQLite database is the main local index
- Raw JSONL artifacts are stored under `~/.trove/raw/`
- `INDEX.md`, `AGENTS.md`, and `CLAUDE.md` are generated locally so agents can orient themselves immediately after a sync
- Hydrated markdown files are stored under `~/.trove/content/`
- Browser cookies are read locally and are not sent to any Trove-operated service
- Raw artifacts may contain personal data from the synced source; sanitize them before sharing in issues, tests, or bug reports

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

If your local default Node version is newer than 22, run the test suite under Node 22 to avoid `better-sqlite3` ABI issues.

## Roadmap

- richer search and filter ergonomics
- broader browser verification
- non-macOS auth paths for cookie-backed sources
