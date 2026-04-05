export type ItemSource = string;

export interface TroveItem {
  source: ItemSource;
  externalId: string;
  title: string;
  url: string;
  excerpt?: string;
  content?: string;
  author?: string;
  savedAt: string;
  importedAt?: string;
  tags?: string[];
  raw?: Record<string, unknown>;
}

export interface SearchResult extends TroveItem {
  id: number;
  rank: number;
}
