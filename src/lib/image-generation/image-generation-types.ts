import type { CoverRenderRatio } from "@/lib/cover-render/cover-render-types";

export type ImageGenerationProvider = "chatgpt_image2";

export type GenerateCoverImageParams = {
  prompt: string;
  ratio: CoverRenderRatio;
  titleText: string;
};

export type GeneratedCoverImage = {
  provider: ImageGenerationProvider;
  ratio: CoverRenderRatio;
  titleText: string;
  prompt: string;
  imageBytes: Buffer;
  mimeType: "image/png";
  diagnostics: {
    model: string;
    timeoutMs: number;
    usingProxy: boolean;
    proxyProtocol: string | null;
  };
};

export interface ImageGenerationAdapter {
  generateCoverImage(params: GenerateCoverImageParams): Promise<GeneratedCoverImage>;
}

export type CoverRedrawWarning = {
  code: string;
  message: string;
};

