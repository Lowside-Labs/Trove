export const ITEMS_FTS_TOKENIZER = "porter unicode61 remove_diacritics 2";

export const baseSchemaSql = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  kind TEXT,
  external_id TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  excerpt TEXT,
  content TEXT,
  author TEXT,
  saved_at TEXT NOT NULL,
  imported_at TEXT NOT NULL,
  tags_json TEXT,
  raw_json TEXT,
  UNIQUE(source, external_id)
);

CREATE TABLE IF NOT EXISTS sync_state (
  source TEXT NOT NULL,
  scope TEXT NOT NULL,
  cursor TEXT,
  last_synced_at TEXT,
  metadata_json TEXT,
  PRIMARY KEY (source, scope)
);
`;

export const ftsSchemaSql = `
CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
  title,
  excerpt,
  content,
  tags,
  author,
  identity,
  url_text,
  tokenize='${ITEMS_FTS_TOKENIZER}'
);
`;

export const schemaSql = `${baseSchemaSql}\n${ftsSchemaSql}`;
