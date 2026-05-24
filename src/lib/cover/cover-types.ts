export type CoverStrategy = "keep_and_replace_title" | "keep_and_optimize_layout" | "redraw_cover";

export type CoverRating = "A" | "B" | "C" | "D";

export type CoverAssetSourceType = "local_upload" | "remote_url";

export type CoverAssetStatus = "unchecked" | "available" | "error";

export type CoverAssetView = {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  sourceType: CoverAssetSourceType;
  remoteUrl: string | null;
  status: CoverAssetStatus;
  errorMessage: string | null;
  url: string;
  createdAt: string;
};

export type CoverEvaluationResult = {
  score: number;
  rating: CoverRating;
  strengths: string[];
  weaknesses: string[];
  strategy: CoverStrategy;
  reason: string;
};

export type CoverEvaluationView = CoverEvaluationResult & {
  evaluationId: string;
  coverAssetId: string | null;
  confirmed: boolean;
  confirmedStrategy: CoverStrategy | null;
  reviewNote: string | null;
  confirmedAt: string | null;
  createdAt: string;
};
