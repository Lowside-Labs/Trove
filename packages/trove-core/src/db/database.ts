import Database from "better-sqlite3";
import { ensureTroveDirs } from "../core/fs.js";
import { ITEMS_FTS_TOKENIZER, baseSchemaSql, schemaSql } from "./schema.js";
import type { SearchResult, TroveItem } from "../types/item.js";

interface ItemRow {
  id: number;
  source: string;
  kind?: string | null;
  external_id: string;
  title: string;
  url: string;
  excerpt: string | null;
  content: string | null;
  author: string | null;
  saved_at: string;
  imported_at: string;
  tags_json: string | null;
  raw_json?: string | null;
  rank?: number;
}

interface SyncStateRow {
  source: string;
  scope: string;
  cursor: string | null;
  last_synced_at: string | null;
  metadata_json: string | null;
}

interface SourceStatsRow {
  source: string;
  count: number;
  last_synced_at: string | null;
}

interface SourceSyncRow {
  source: string;
  last_synced_at: string | null;
}

interface ArchiveOverviewRow {
  total_items: number;
  total_sources: number;
  last_synced_at: string | null;
}

interface MasterSqlRow {
  sql: string | null;
}

interface TableInfoRow {
  name: string;
}

export interface SyncStateRecord {
  source: string;
  scope: string;
  cursor?: string;
  lastSyncedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface SourceStatsRecord {
  source: string;
  count: number;
  lastSyncedAt?: string;
}

export interface SourceSyncRecord {
  source: string;
  lastSyncedAt?: string;
}

export interface ArchiveOverviewRecord {
  totalItems: number;
  totalSources: number;
  lastSyncedAt?: string;
}

export interface StoredItem extends TroveItem {
  id: number;
}

export interface TopAuthorRecord {
  author: string;
  count: number;
}

export interface ItemCursor {
  savedAt: string;
  id: number;
}

export interface UpsertItemsResult {
  insertedCount: number;
  updatedCount: number;
}

export function openDatabase(root?: string): Database.Database {
  const paths = ensureTroveDirs(root);
  const db = new Database(paths.dbPath);
  db.pragma("journal_mode = WAL");
  db.exec(baseSchemaSql);
  ensureItemsSchema(db);
  ensureFtsSchema(db);
  return db;
}

export function withDatabase<T>(fn: (db: Database.Database) => T, root?: string): T {
  const db = openDatabase(root);
  try {
    return fn(db);
  } finally {
    db.close();
  }
}

export function upsertItems(db: Database.Database, items: TroveItem[]): UpsertItemsResult {
  const statement = db.prepare(`
    INSERT INTO items (
      source,
      kind,
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
      @kind,
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
      kind = excluded.kind,
      excerpt = excluded.excerpt,
      content = excluded.content,
      author = excluded.author,
      saved_at = excluded.saved_at,
      imported_at = excluded.imported_at,
      tags_json = excluded.tags_json,
      raw_json = excluded.raw_json
  `);
  const existingStatement = db.prepare<[string, string], { id: number } | undefined>(
    "SELECT id FROM items WHERE source = ? AND external_id = ?",
  );

  const insertMany = db.transaction((records: TroveItem[]) => {
    let insertedCount = 0;
    let updatedCount = 0;

    for (const item of records) {
      const exists = existingStatement.get(item.source, item.externalId);

      statement.run({
        source: item.source,
        kind: item.kind,
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

      if (exists) {
        updatedCount += 1;
      } else {
        insertedCount += 1;
      }
    }

    return { insertedCount, updatedCount };
  });

  return insertMany(items);
}

export function searchItems(db: Database.Database, query: string, limit = 10): SearchResult[] {
  const statement = db.prepare(
    `
      SELECT
        items.id,
        items.source,
        items.kind,
        items.external_id,
        items.title,
        items.url,
        items.excerpt,
        items.content,
        items.author,
        items.saved_at,
        items.imported_at,
        items.tags_json,
        items.raw_json,
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

export function searchItemsPage(
  db: Database.Database,
  query: string,
  options?: {
    limit?: number;
    offset?: number;
    source?: string;
  },
): SearchResult[] {
  const limit = options?.limit ?? 10;
  const offset = options?.offset ?? 0;
  const sourceClause = options?.source ? " AND items.source = ?" : "";
  const statement = db.prepare(
    `
      SELECT
        items.id,
        items.source,
        items.kind,
        items.external_id,
        items.title,
        items.url,
        items.excerpt,
        items.content,
        items.author,
        items.saved_at,
        items.imported_at,
        items.tags_json,
        items.raw_json,
        bm25(items_fts) AS rank
      FROM items_fts
      JOIN items ON items.id = items_fts.rowid
      WHERE items_fts MATCH ?
      ${sourceClause}
      ORDER BY rank
      LIMIT ? OFFSET ?
    `,
  );

  const params = options?.source ? [query, options.source, limit, offset] : [query, limit, offset];
  return (statement.all(...params) as ItemRow[]).map(mapRowToSearchResult);
}

export function getSourceCounts(db: Database.Database): Array<{ source: string; count: number }> {
  return db
    .prepare(
      "SELECT source, COUNT(*) AS count FROM items GROUP BY source ORDER BY count DESC, source ASC",
    )
    .all() as Array<{ source: string; count: number }>;
}

export function getSourceStats(db: Database.Database): SourceStatsRecord[] {
  const rows = db
    .prepare(
      `
        SELECT
          items.source AS source,
          COUNT(*) AS count,
          sync.last_synced_at AS last_synced_at
        FROM items
        LEFT JOIN (
          SELECT source, MAX(last_synced_at) AS last_synced_at
          FROM sync_state
          GROUP BY source
        ) AS sync ON sync.source = items.source
        GROUP BY items.source
        ORDER BY count DESC, items.source ASC
      `,
    )
    .all() as SourceStatsRow[];

  return rows.map((row) => ({
    source: row.source,
    count: row.count,
    ...(row.last_synced_at ? { lastSyncedAt: row.last_synced_at } : {}),
  }));
}

export function getSourceSyncRecords(db: Database.Database): SourceSyncRecord[] {
  const rows = db
    .prepare(
      `
        SELECT source, MAX(last_synced_at) AS last_synced_at
        FROM sync_state
        GROUP BY source
        ORDER BY source ASC
      `,
    )
    .all() as SourceSyncRow[];

  return rows.map((row) => ({
    source: row.source,
    ...(row.last_synced_at ? { lastSyncedAt: row.last_synced_at } : {}),
  }));
}

export function getArchiveOverview(db: Database.Database): ArchiveOverviewRecord {
  const row = db
    .prepare(
      `
        SELECT
          COUNT(*) AS total_items,
          COUNT(DISTINCT source) AS total_sources,
          (SELECT MAX(last_synced_at) FROM sync_state) AS last_synced_at
        FROM items
      `,
    )
    .get() as ArchiveOverviewRow | undefined;

  if (!row) {
    return {
      totalItems: 0,
      totalSources: 0,
    };
  }

  return {
    totalItems: row.total_items,
    totalSources: row.total_sources,
    ...(row.last_synced_at ? { lastSyncedAt: row.last_synced_at } : {}),
  };
}

export function listItems(
  db: Database.Database,
  options?: {
    limit?: number;
    source?: string;
    missingContentOnly?: boolean;
  },
): StoredItem[] {
  const params: Array<string | number> = [];
  const conditions: string[] = [];

  if (options?.source) {
    conditions.push("source = ?");
    params.push(options.source);
  }

  if (options?.missingContentOnly) {
    conditions.push("(content IS NULL OR trim(content) = '')");
  }

  const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
  const limitClause = typeof options?.limit === "number" ? " LIMIT ?" : "";

  if (typeof options?.limit === "number") {
    params.push(options.limit);
  }

  const rows = db
    .prepare(
      `
        SELECT
          id,
          source,
          kind,
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
        FROM items
        ${whereClause}
        ORDER BY saved_at DESC, id DESC
        ${limitClause}
      `,
    )
    .all(...params) as ItemRow[];

  return rows.map(mapRowToStoredItem);
}

export function listItemsPage(
  db: Database.Database,
  options?: {
    limit?: number;
    source?: string;
    missingContentOnly?: boolean;
    cursor?: ItemCursor;
  },
): StoredItem[] {
  const params: Array<string | number> = [];
  const conditions: string[] = [];

  if (options?.source) {
    conditions.push("source = ?");
    params.push(options.source);
  }

  if (options?.missingContentOnly) {
    conditions.push("(content IS NULL OR trim(content) = '')");
  }

  if (options?.cursor) {
    conditions.push("(saved_at < ? OR (saved_at = ? AND id < ?))");
    params.push(options.cursor.savedAt, options.cursor.savedAt, options.cursor.id);
  }

  const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
  const limit = options?.limit ?? 50;
  params.push(limit);

  const rows = db
    .prepare(
      `
        SELECT
          id,
          source,
          kind,
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
        FROM items
        ${whereClause}
        ORDER BY saved_at DESC, id DESC
        LIMIT ?
      `,
    )
    .all(...params) as ItemRow[];

  return rows.map(mapRowToStoredItem);
}

export function getItemById(db: Database.Database, itemId: number): StoredItem | null {
  const row = db
    .prepare<[number], ItemRow>(
      `
        SELECT
          id,
          source,
          kind,
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
        FROM items
        WHERE id = ?
      `,
    )
    .get(itemId);

  return row ? mapRowToStoredItem(row) : null;
}

export function getTopAuthors(db: Database.Database, limit = 10): TopAuthorRecord[] {
  return db
    .prepare<[number], TopAuthorRecord>(
      `
        SELECT author, COUNT(*) AS count
        FROM items
        WHERE author IS NOT NULL AND trim(author) <> ''
        GROUP BY author
        ORDER BY count DESC, author ASC
        LIMIT ?
      `,
    )
    .all(limit);
}

export function updateItemHydration(
  db: Database.Database,
  itemId: number,
  fields: {
    content: string;
    excerpt?: string;
  },
): void {
  if (fields.excerpt !== undefined) {
    db.prepare(
      `
        UPDATE items
        SET content = @content,
            excerpt = @excerpt
        WHERE id = @itemId
      `,
    ).run({
      itemId,
      content: fields.content,
      excerpt: fields.excerpt,
    });

    return;
  }

  db.prepare(
    `
      UPDATE items
      SET content = @content
      WHERE id = @itemId
    `,
  ).run({
    itemId,
    content: fields.content,
  });
}

export function getSyncState(
  db: Database.Database,
  source: string,
  scope: string,
): SyncStateRecord | null {
  const row = db
    .prepare<[string, string], SyncStateRow>(
      "SELECT source, scope, cursor, last_synced_at, metadata_json FROM sync_state WHERE source = ? AND scope = ?",
    )
    .get(source, scope);

  if (!row) {
    return null;
  }

  const state: SyncStateRecord = {
    source: row.source,
    scope: row.scope,
  };

  if (row.cursor !== null) {
    state.cursor = row.cursor;
  }

  if (row.last_synced_at !== null) {
    state.lastSyncedAt = row.last_synced_at;
  }

  if (row.metadata_json !== null) {
    state.metadata = JSON.parse(row.metadata_json) as Record<string, unknown>;
  }

  return state;
}

export function upsertSyncState(db: Database.Database, state: SyncStateRecord): void {
  db.prepare(
    `
      INSERT INTO sync_state (source, scope, cursor, last_synced_at, metadata_json)
      VALUES (@source, @scope, @cursor, @lastSyncedAt, @metadataJson)
      ON CONFLICT(source, scope) DO UPDATE SET
        cursor = excluded.cursor,
        last_synced_at = excluded.last_synced_at,
        metadata_json = excluded.metadata_json
    `,
  ).run({
    source: state.source,
    scope: state.scope,
    cursor: state.cursor ?? null,
    lastSyncedAt: state.lastSyncedAt ?? new Date().toISOString(),
    metadataJson: JSON.stringify(state.metadata ?? {}),
  });
}

function mapRowToSearchResult(row: ItemRow): SearchResult {
  const result: SearchResult = {
    id: row.id,
    source: row.source as SearchResult["source"],
    kind: row.kind ?? deriveKindFromRow(row),
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

  if (row.raw_json !== null && row.raw_json !== undefined) {
    result.raw = JSON.parse(row.raw_json) as Record<string, unknown>;
  }

  return result;
}

function mapRowToStoredItem(row: ItemRow): StoredItem {
  const item: StoredItem = {
    id: row.id,
    source: row.source,
    kind: row.kind ?? deriveKindFromRow(row),
    externalId: row.external_id,
    title: row.title,
    url: row.url,
    savedAt: row.saved_at,
    importedAt: row.imported_at,
    tags: row.tags_json ? (JSON.parse(row.tags_json) as string[]) : [],
  };

  if (row.excerpt !== null) {
    item.excerpt = row.excerpt;
  }

  if (row.content !== null) {
    item.content = row.content;
  }

  if (row.author !== null) {
    item.author = row.author;
  }

  if (row.raw_json !== null && row.raw_json !== undefined) {
    item.raw = JSON.parse(row.raw_json) as Record<string, unknown>;
  }

  return item;
}

function ensureFtsSchema(db: Database.Database): void {
  const row = db
    .prepare<[string], MasterSqlRow>(
      "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?",
    )
    .get("items_fts");

  if (row?.sql?.includes(`tokenize='${ITEMS_FTS_TOKENIZER}'`) && row.sql.includes("tags")) {
    return;
  }

  db.exec(`
    DROP TRIGGER IF EXISTS items_ai;
    DROP TRIGGER IF EXISTS items_ad;
    DROP TRIGGER IF EXISTS items_au;
    DROP TABLE IF EXISTS items_fts;
  `);
  db.exec(schemaSql);
  db.prepare(
    `
      INSERT INTO items_fts(rowid, title, excerpt, content, tags)
      SELECT id, title, excerpt, content, tags_json
      FROM items
    `,
  ).run();
}

function ensureItemsSchema(db: Database.Database): void {
  const columns = db.prepare<[], TableInfoRow>("PRAGMA table_info(items)").all();
  const hasKindColumn = columns.some((column) => column.name === "kind");

  if (!hasKindColumn) {
    db.exec("ALTER TABLE items ADD COLUMN kind TEXT");
  }

  db.exec(`
    UPDATE items
    SET kind = CASE
      WHEN json_extract(raw_json, '$.kind') IS NOT NULL THEN json_extract(raw_json, '$.kind')
      WHEN source IN ('claude', 'chatgpt') THEN 'chat'
      ELSE source
    END
    WHERE kind IS NULL OR trim(kind) = '';
  `);
}

function deriveKindFromRow(row: Pick<ItemRow, "source" | "raw_json">): string {
  if (row.raw_json) {
    try {
      const raw = JSON.parse(row.raw_json) as Record<string, unknown>;

      if (typeof raw.kind === "string" && raw.kind.length > 0) {
        return raw.kind;
      }
    } catch {
      // Ignore invalid raw_json here and fall back to the source-derived kind.
    }
  }

  if (row.source === "claude" || row.source === "chatgpt") {
    return "chat";
  }

  return row.source;
}
