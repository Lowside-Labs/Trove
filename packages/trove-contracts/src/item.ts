import { z } from "zod";

export const itemSourceSchema = z.string().min(1);

export type ItemSource = z.infer<typeof itemSourceSchema>;

export const troveItemSchema = z.object({
  source: itemSourceSchema,
  kind: z.string().min(1),
  externalId: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url(),
  excerpt: z.string().min(1).optional(),
  content: z.string().optional(),
  author: z.string().min(1).optional(),
  savedAt: z.string().min(1),
  importedAt: z.string().min(1).optional(),
  tags: z.array(z.string().min(1)).optional(),
  raw: z.record(z.string(), z.unknown()).optional(),
});

export type TroveItem = z.infer<typeof troveItemSchema>;

export const searchResultSchema = troveItemSchema.extend({
  id: z.number().int().nonnegative(),
  rank: z.number(),
});

export type SearchResult = z.infer<typeof searchResultSchema>;
