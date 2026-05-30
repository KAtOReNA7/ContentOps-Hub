export type BatchJobStep = "identify" | "rating" | "title_intro" | "cover_evaluation";

export type BatchJobType = BatchJobStep | "mixed";

export type BatchJobStatus = "pending" | "running" | "success" | "failed" | "partial_success" | "canceled";

export type BatchJobItemStatus = "pending" | "running" | "success" | "failed" | "skipped";

export type CreateBatchJobInput = {
  type: BatchJobType;
  workIds: string[];
  steps: BatchJobStep[];
  costRiskAccepted: boolean;
  note?: string | null;
  identifyProviderMode?: "mock" | "configured";
  titleIntroProvider?: "mock" | "openai";
};

export const batchJobSteps: BatchJobStep[] = ["identify", "rating", "title_intro", "cover_evaluation"];

export const batchJobStatuses: BatchJobStatus[] = [
  "pending",
  "running",
  "success",
  "failed",
  "partial_success",
  "canceled",
];

export function isBatchJobStep(value: unknown): value is BatchJobStep {
  return typeof value === "string" && batchJobSteps.includes(value as BatchJobStep);
}

export function isBatchJobStatus(value: unknown): value is BatchJobStatus {
  return typeof value === "string" && batchJobStatuses.includes(value as BatchJobStatus);
}
