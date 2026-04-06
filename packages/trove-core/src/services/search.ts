import type { SearchResult } from "trove-contracts";
import { searchItems, withDatabase } from "../db/database.js";

export function searchWorkspace(
  query: string,
  options?: { limit?: number; root?: string },
): SearchResult[] {
  return withDatabase((db) => searchItems(db, query, options?.limit), options?.root);
}
