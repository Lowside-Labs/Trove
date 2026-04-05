# Trove

Your saved web content, unified and searchable — for as long as you want it.

Trove is a local-first CLI that pulls the things you've saved across the web into one searchable archive on your Mac. X saves, Hacker News favorites, Substack saves, and AI chat history can all land in one local SQLite database with full-text search. No cloud, no API keys, no subscription, no vendor lock-in.

Every platform has a "save for later" feature, and every platform makes it nearly impossible to find what you saved. Twitter bookmarks are unsearchable. Reddit saves get buried. GitHub stars pile up. Chrome history is a flat list. Your saves live in a dozen silos that don't talk to each other, and any one of them could disappear tomorrow. Trove gives you one local store for all of it, with ranked full-text search across the entire corpus, persisted in open formats you can read with any tool.

## How it works

The trick that makes this feel seamless is **browser session reuse**. Instead of walking you through OAuth flows for every platform, Trove reads the authenticated cookies from your Chromium-based browser, decrypts them via the macOS Keychain, and replays your own browser session against each platform's internal APIs. You're already logged in — Trove just borrows the session for the length of a sync and discards it afterwards.

For X specifically, Trove launches a short-lived Playwright session to discover the current Bookmarks GraphQL request shape, then replays pagination from plain Node fetch. This means Trove keeps working even when Twitter rotates its internal query IDs: it never hardcodes them, it re-discovers them on every sync.

## What's here today

- TypeScript + ESM, Node 22+
- `commander`-based command surface
- SQLite with FTS5 full-text search
- Seamless Chromium cookie reuse on macOS (Chrome and Dia verified; Brave and Arc detected but not yet verified)
- X bookmarks and likes sync with live request-shape discovery, incremental cursor persistence, and raw JSONL archival of every API response
- Hacker News favorites and favorite comments sync
- Substack saved items sync
- Claude and ChatGPT chat export through live browser attachment with Markdown output
- Filesystem layout ready for the raw-content and hydrated-content pipelines

## Quick start

```bash
npm install
npm run build
node dist/cli.js init
node dist/cli.js sync x --browser chrome
node dist/cli.js search "bookmarks"
```

Or in development:

```bash
npm run dev -- init
npm run dev -- sync x --browser chrome
npm run dev -- search "bookmarks"
```

## Initial commands

- `trove init`: create the local Trove data directory and initialize the SQLite database
- `trove sync x --browser chrome`: import X bookmarks by reusing an authenticated Chromium browser session
- `trove sync hn --user <username>`: import public Hacker News favorites
- `trove sync substack --browser chrome`: import saved Substack posts
- `trove sync claude --cdp-url http://127.0.0.1:9222`: export Claude chats from a live browser session
- `trove sync chatgpt --cdp-url http://127.0.0.1:9222`: export ChatGPT chats from a live browser session
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

## X

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
