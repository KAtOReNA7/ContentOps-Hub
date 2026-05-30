export type ExperimentImportRow = Record<string, unknown>;

export type ExperimentRecommendation = "adopt" | "continue_test" | "rollback" | "need_more_data";

export type ExperimentConfidenceLevel = "high" | "medium" | "low";

export type NormalizedExperimentRow = {
  rowNumber: number;
  externalId: string;
  sourceTitle: string;
  title: string;
  author: string;
  experimentName: string;
  groupType: "control" | "variant";
  variantName: string | null;
  intro: string | null;
  coverUrl: string | null;
  exposureCount: number | null;
  clickCount: number | null;
  ctr: number | null;
  playCount: number | null;
  conversionCount: number | null;
  conversionRate: number | null;
  finishRate: number | null;
  revenue: number | null;
  testStartDate: Date | null;
  testEndDate: Date | null;
  note: string | null;
};
