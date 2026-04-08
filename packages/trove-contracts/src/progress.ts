import { z } from "zod";

export const progressEventSchema = z.object({
  phase: z.string().min(1),
  message: z.string().min(1),
  completed: z.number().nonnegative().optional(),
  total: z.number().positive().optional(),
});

export type ProgressEvent = z.infer<typeof progressEventSchema>;

export type ProgressHandler = (event: ProgressEvent) => void;
