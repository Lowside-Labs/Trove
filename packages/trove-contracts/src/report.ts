import { z } from "zod";

export const outputToneSchema = z.enum([
  "default",
  "muted",
  "info",
  "success",
  "warning",
  "danger",
  "accent",
]);

export type OutputTone = z.infer<typeof outputToneSchema>;

export const summaryEntrySchema = z.object({
  label: z.string().min(1),
  value: z.string(),
  tone: outputToneSchema.optional(),
});

export type SummaryEntry = z.infer<typeof summaryEntrySchema>;

export const summarySectionSchema = z.object({
  title: z.string().min(1),
  entries: z.array(summaryEntrySchema),
});

export type SummarySection = z.infer<typeof summarySectionSchema>;

export const commandReportSchema = z.object({
  headline: z.string().min(1),
  sections: z.array(summarySectionSchema),
  notes: z.array(z.string().min(1)).optional(),
});

export type CommandReport = z.infer<typeof commandReportSchema>;

export const commandRunReportSchema = commandReportSchema.extend({
  label: z.string().min(1),
  count: z.number().int().nonnegative().optional(),
});

export type CommandRunReport = z.infer<typeof commandRunReportSchema>;

export const statsReportRowSchema = z.object({
  source: z.string().min(1),
  count: z.number().int().nonnegative(),
  lastSyncedAt: z.string().min(1).optional(),
});

export type StatsReportRow = z.infer<typeof statsReportRowSchema>;

export const statsReportSchema = z.object({
  totalItems: z.number().int().nonnegative(),
  totalSources: z.number().int().nonnegative(),
  lastSyncedAt: z.string().min(1).optional(),
  rows: z.array(statsReportRowSchema),
});

export type StatsReport = z.infer<typeof statsReportSchema>;
