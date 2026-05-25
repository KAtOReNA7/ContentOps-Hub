import type { CoverStrategy } from "@/lib/cover/cover-types";

export type CoverRenderRatio = "1:1" | "3:4";

export type CoverRenderStatus = "success" | "failed";

export type CoverRenderProvider = "local_sharp" | "chatgpt_image2";

export type CoverRenderView = {
  id: string;
  coverAssetId: string | null;
  titleIntroGenerationId: string | null;
  titleText: string;
  strategy: CoverStrategy;
  outputRatio: CoverRenderRatio;
  prompt: string;
  provider: CoverRenderProvider;
  outputUrl: string;
  status: CoverRenderStatus;
  errorMessage: string | null;
  createdAt: string;
};

export type CoverRenderTitleOption = {
  title: string;
  reason: string;
};
