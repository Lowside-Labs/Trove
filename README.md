# Trove

![Trove repository artwork](assets/trove-thumbnail.jpg)

Trove is a local-first CLI for building a searchable archive from the things you save across the web. It pulls source-native data into a local SQLite database, preserves compact raw artifacts on disk, and lets you search everything from one place.

Trove is for people who save too much from X, Hacker News, Substack, GitHub, and AI tools and want one local archive instead of five silos.

## What works today

- Local SQLite archive with FTS5 full-text search
- X bookmarks and likes via authenticated browser-session reuse
- Substack saved items and likes via authenticated browser-session reuse
- GitHub stars via authenticated browser-session reuse
- Hacker News favorites and favorite comments from public pages
- Claude and ChatGPT chat export through live CDP browser attachment
- Raw JSONL artifact storage under `~/.trove/raw/`

## Current support matrix

| Source | Modes | Auth method | Status | Notes |
| --- | --- | --- | --- | --- |
| `x` | `bookmarks`, `likes` | Chromium cookie reuse | Working | macOS only for cookie-backed sync today |
| `substack` | `saved`, `likes` | Chromium cookie reuse | Working | likes include posts and notes/comments |
| `github` | `stars` | Chromium cookie reuse | Working | authenticated stars page parsing |
| `hn` | `favorites`, `favorite-comments` | public web | Working | no browser session required |
| `claude` | chat export | live CDP session | Working | requires a running Chromium instance with remote debugging |
| `chatgpt` | chat export | live CDP session | Working | requires a running Chromium instance with remote debugging |

## Supported platforms and limitations

- `Node 22+` is the supported runtime.
- Seamless Chromium-cookie reuse is currently implemented only on macOS.
- `chrome` and `dia` are verified for cookie-backed sync.
- `brave` and `arc` are detected but still marked experimental.
- Some sources do not expose true saved/liked timestamps. Trove stores the closest source-native timestamp available.
- Trove does not yet run a general readability or hydration pipeline for external links.

## Installation

Trove is currently set up as a source-install project.

```bash
git clone https://github.com/Lowside-Labs/Trove.git
cd Trove
npm install
npm run build
```

You can then run the built CLI directly:

```bash
node dist/cli.js --help
```

Or run it in development:

```bash
npm run dev -- --help
```

## Quick start

This is the fastest path to a first successful sync on a supported machine:

```bash
npm run build
node dist/cli.js init
node dist/cli.js sync x --browser chrome --limit 20
node dist/cli.js stats
node dist/cli.js search 'tags:bookmark'
```

`trove sync x` runs both `bookmarks` and `likes` by default. The same pattern applies to `substack` and `hn` unless you pass `--kind`.

## Common commands

- `trove init`: create `~/.trove/` and initialize the SQLite database
- `trove sync <source>`: pull items from a source into the local archive
- `trove search <query>`: run an FTS query across indexed items
- `trove stats`: show item counts and archive freshness

## Common flags

- `--browser <browser>`: select the Chromium browser profile source, for example `chrome` or `dia`
- `--profile <profile>`: select a non-default Chromium profile
- `--kind <kind>`: choose a source mode instead of running the default set
- `--limit <number>`: cap the number of imported items
- `--headful`: show the browser while Trove discovers an authenticated request shape
- `--cdp-url <url>`: attach to a running browser for `claude` and `chatgpt`
- `--debug-raw-pages`: keep full X GraphQL page payloads for debugging

## Source examples

```bash
# X: bookmarks + likes by default
node dist/cli.js sync x --browser chrome

# X: likes only
node dist/cli.js sync x --browser dia --kind likes

# Substack: saved + likes by default
node dist/cli.js sync substack --browser chrome

# Substack: saved only
node dist/cli.js sync substack --browser chrome --kind saved

# GitHub stars
node dist/cli.js sync github --browser chrome

# Hacker News public favorites
node dist/cli.js sync hn --user <username> --kind favorites

# Claude export through a live browser attachment
node dist/cli.js sync claude --cdp-url http://127.0.0.1:9222
```

## Search examples

```bash
node dist/cli.js search 'tags:bookmark'
node dist/cli.js search 'tags:like'
node dist/cli.js search 'sqlite vector search'
node dist/cli.js search 'substack note'
```

Trove currently exposes SQLite FTS5 search directly. Column-qualified queries such as `tags:bookmark` work because tags are indexed in the FTS table.

## How it works

For cookie-backed sources, Trove reuses your local authenticated Chromium session instead of asking for OAuth credentials. It reads cookies from your selected browser profile, decrypts them through the macOS Keychain, and replays your own session against the source's web application.

For X specifically, Trove launches a short-lived Playwright session to discover the current GraphQL request shape before replaying pagination from plain `fetch`. That keeps the sync resilient when X rotates internal query IDs.

## Data storage and privacy

By default, Trove stores data in `~/.trove/`:

```text
~/.trove/
  data/
    trove.db
  raw/
  content/
  index/
  logs/
```

- The SQLite database is the main local index.
- Raw JSONL artifacts are stored under `~/.trove/raw/`.
- Browser cookies are read locally and are not sent to any Trove-operated service.
- Raw artifacts may contain personal data from the synced source. Sanitize them before sharing in issues, tests, or bug reports.

## Troubleshooting

- If cookie-backed sync says no cookies were found, confirm that you are logged into the target service in the selected browser profile.
- If a browser-backed source fails on Linux or Windows, that is expected today. Seamless cookie reuse is only implemented on macOS.
- If `npm test` fails with a `better-sqlite3` native-module mismatch, verify that you are using Node 22 as declared in `package.json`.
- If `claude` or `chatgpt` sync fails to attach, confirm that Chromium is already running with remote debugging enabled and that `--cdp-url` is correct.

## Development

```bash
npm install
npm run typecheck
npm test
```

If your local default Node version is newer than 22, run the test suite under Node 22 to avoid `better-sqlite3` ABI issues.

## Roadmap

- external-link hydration and readability extraction
- richer search and filter ergonomics
- broader browser verification
- non-macOS auth paths for cookie-backed sources
