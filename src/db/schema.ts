export const schemaSql = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
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

CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
  title,
  excerpt,
  content,
  tags,
  content='items',
  content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS items_ai AFTER INSERT ON items BEGIN
  INSERT INTO items_fts(rowid, title, excerpt, content, tags)
  VALUES (new.id, new.title, new.excerpt, new.content, new.tags_json);
END;

CREATE TRIGGER IF NOT EXISTS items_ad AFTER DELETE ON items BEGIN
  INSERT INTO items_fts(items_fts, rowid, title, excerpt, content, tags)
  VALUES('delete', old.id, old.title, old.excerpt, old.content, old.tags_json);
END;

CREATE TRIGGER IF NOT EXISTS items_au AFTER UPDATE ON items BEGIN
  INSERT INTO items_fts(items_fts, rowid, title, excerpt, content, tags)
  VALUES('delete', old.id, old.title, old.excerpt, old.content, old.tags_json);
  INSERT INTO items_fts(rowid, title, excerpt, content, tags)
  VALUES (new.id, new.title, new.excerpt, new.content, new.tags_json);
END;
`;
