# Trove

Your saved web content, unified and searchable — for as long as you want it.

Trove is a local-first CLI that pulls the things you've saved across the web into one searchable archive on your Mac. Twitter bookmarks today — Reddit saves, GitHub stars, and browsing history on the way — all collapsed into a single local SQLite database with full-text search. No cloud, no API keys, no subscription, no vendor lock-in.

Every platform has a "save for later" feature, and every platform makes it nearly impossible to find what you saved. Twitter bookmarks are unsearchable. Reddit saves get buried. GitHub stars pile up. Chrome history is a flat list. Your saves live in a dozen silos that don't talk to each other, and any one of them could disappear tomorrow. Trove gives you one local store for all of it, with ranked full-text search across the entire corpus, persisted in open formats you can read with any tool.

## How it works

The trick that makes this feel seamless is **browser session reuse**. Instead of walking you through OAuth flows for every platform, Trove reads the authenticated cookies from your Chromium-based browser, decrypts them via the macOS Keychain, and replays your own browser session against each platform's internal APIs. You're already logged in — Trove just borrows the session for the length of a sync and discards it afterwards.

For X specifically, Trove launches a short-lived Playwright session to discover the current Bookmarks GraphQL request shape, then replays pagination from plain Node fetch. This means Trove keeps working even when Twitter rotates its internal query IDs: it never hardcodes them, it re-discovers them on every sync.

## What's here today

- TypeScript + ESM, Node 22+
- `commander`-based command surface
- SQLite with FTS5 full-text search
- Seamless Chromium cookie reuse on macOS (Chrome and Dia verified; Brave and Arc detected but not yet verified)
- X bookmarks sync with live request-shape discovery, incremental cursor persistence, and raw JSONL archival of every API response
- Demo source adapter to seed the database
- Filesystem layout ready for the raw-content and hydrated-content pipelines

## Quick start

```bash
npm install
npm run build
node dist/cli.js init
node dist/cli.js sync demo
node dist/cli.js search "browser"
```

Or in development:

```bash
npm run dev -- init
npm run dev -- sync demo
npm run dev -- search "research memory"
```

## Initial commands

- `trove init`: create the local Trove data directory and initialize the SQLite database
- `trove sync demo`: import a small demo corpus into the local database
- `trove sync x --browser chrome`: import X bookmarks by reusing an authenticated Chromium browser session
- `trove search <query>`: run an FTS search against indexed items
- `trove stats`: inspect item counts by source

## Local data layout

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

The SQLite database is the source of truth. The sibling directories are reserved for raw API payloads, hydrated readable content, derived indexes, and logs.

## X bookmarks

The first real source adapter is `x`.

```bash
npm run dev -- sync x --browser chrome
```

Current behavior:

- macOS only
- seamless cookie reuse is verified for `chrome` and `dia`
- `brave` and `arc` are detected in the browser layer, but not yet verified for cookie decryption
- Trove uses your browser session to discover the current bookmarks request shape, then replays pagination from Node
- Trove stores a per-browser/profile cursor for X so later syncs can resume incrementally
- Trove stores clean bookmark records as JSON Lines files under `~/.trove/raw/x/`
- full GraphQL page payloads are only stored when you pass `--debug-raw-pages`

If the CLI says no cookies were found, confirm that you are logged into X in the selected browser profile.
