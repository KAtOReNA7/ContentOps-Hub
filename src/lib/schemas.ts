import { z } from "zod";

export const WorkSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  author: z.string().min(1),
  description: z.string().min(1),
  coverUrl: z.string().url().optional(),
  status: z.enum(["imported", "analyzed", "failed"]),
  statusLabel: z.string(),
});

export const AnalysisResultSchema = z.object({
  workId: z.string(),
  score: z.number().int().min(0).max(100),
  grade: z.enum(["S", "A", "B", "C"]),
  summary: z.string().min(1),
  titleIdeas: z.array(z.string().min(1)).min(1),
  introIdeas: z.array(z.string().min(1)).min(1),
  riskNotes: z.string().min(1),
});

export type Work = z.infer<typeof WorkSchema>;
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
