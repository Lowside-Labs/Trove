# Trove

Trove is a local-first CLI for collecting, indexing, and searching saved web content.

## What this scaffold includes

- TypeScript + ESM CLI entrypoint
- `commander` command surface
- SQLite storage with FTS5 search
- A demo source adapter to seed the database
- A filesystem layout helper for future raw-content and hydrated-content pipelines

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

If the CLI says no cookies were found, confirm that you are logged into X in the selected browser profile.
