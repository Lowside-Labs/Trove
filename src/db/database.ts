import Database from "better-sqlite3";
import { ensureTroveDirs } from "../core/fs.js";
import { schemaSql } from "./schema.js";
import type { SearchResult, TroveItem } from "../types/item.js";

interface ItemRow {
  id: number;
  source: string;
  external_id: string;
  title: string;
  url: string;
  excerpt: string | null;
  content: string | null;
  author: string | null;
  saved_at: string;
  imported_at: string;
  tags_json: string | null;
  rank?: number;
}

export function openDatabase(root?: string): Database.Database {
  const paths = ensureTroveDirs(root);
  const db = new Database(paths.dbPath);
  db.pragma("journal_mode = WAL");
  db.exec(schemaSql);
  return db;
}

export function upsertItems(db: Database.Database, items: TroveItem[]): number {
  const statement = db.prepare(`
    INSERT INTO items (
      source,
      external_id,
      title,
      url,
      excerpt,
      content,
      author,
      saved_at,
      imported_at,
      tags_json,
      raw_json
    ) VALUES (
      @source,
      @externalId,
      @title,
      @url,
      @excerpt,
      @content,
      @author,
      @savedAt,
      @importedAt,
      @tagsJson,
      @rawJson
    )
    ON CONFLICT(source, external_id) DO UPDATE SET
      title = excluded.title,
      url = excluded.url,
      excerpt = excluded.excerpt,
      content = excluded.content,
      author = excluded.author,
      saved_at = excluded.saved_at,
      imported_at = excluded.imported_at,
      tags_json = excluded.tags_json,
      raw_json = excluded.raw_json
  `);

  const insertMany = db.transaction((records: TroveItem[]) => {
    for (const item of records) {
      statement.run({
        source: item.source,
        externalId: item.externalId,
        title: item.title,
        url: item.url,
        excerpt: item.excerpt ?? null,
        content: item.content ?? null,
        author: item.author ?? null,
        savedAt: item.savedAt,
        importedAt: item.importedAt ?? new Date().toISOString(),
        tagsJson: JSON.stringify(item.tags ?? []),
        rawJson: JSON.stringify(item.raw ?? {}),
      });
    }
  });

  insertMany(items);
  return items.length;
}

export function searchItems(db: Database.Database, query: string, limit = 10): SearchResult[] {
  const statement = db.prepare(
    `
      SELECT
        items.id,
        items.source,
        items.external_id,
        items.title,
        items.url,
        items.excerpt,
        items.content,
        items.author,
        items.saved_at,
        items.imported_at,
        items.tags_json,
        bm25(items_fts) AS rank
      FROM items_fts
      JOIN items ON items.id = items_fts.rowid
      WHERE items_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `,
  );

  return (statement.all(query, limit) as ItemRow[]).map(mapRowToSearchResult);
}

export function getSourceCounts(db: Database.Database): Array<{ source: string; count: number }> {
  return db
    .prepare("SELECT source, COUNT(*) AS count FROM items GROUP BY source ORDER BY count DESC, source ASC")
    .all() as Array<{ source: string; count: number }>;
}

function mapRowToSearchResult(row: ItemRow): SearchResult {
  const result: SearchResult = {
    id: row.id,
    source: row.source as SearchResult["source"],
    externalId: row.external_id,
    title: row.title,
    url: row.url,
    savedAt: row.saved_at,
    importedAt: row.imported_at,
    tags: row.tags_json ? (JSON.parse(row.tags_json) as string[]) : [],
    rank: row.rank ?? 0,
  };

  if (row.excerpt !== null) {
    result.excerpt = row.excerpt;
  }

  if (row.content !== null) {
    result.content = row.content;
  }

  if (row.author !== null) {
    result.author = row.author;
  }

  return result;
}
