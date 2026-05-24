import type { CoverStrategy } from "@/lib/cover/cover-types";

export type CoverRenderRatio = "1:1" | "3:4";

export type CoverRenderStatus = "success" | "failed";

export type CoverRenderView = {
  id: string;
  coverAssetId: string;
  titleIntroGenerationId: string | null;
  titleText: string;
  strategy: CoverStrategy;
  outputRatio: CoverRenderRatio;
  outputUrl: string;
  status: CoverRenderStatus;
  errorMessage: string | null;
  createdAt: string;
};

export type CoverRenderTitleOption = {
  title: string;
  reason: string;
};
