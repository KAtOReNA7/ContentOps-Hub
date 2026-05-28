import type { TitleIntroGenerationInput, TitleIntroGenerationResult } from "@/lib/generation/title-intro-types";

export type TitleIntroLlmAdapter = {
  generate(input: TitleIntroGenerationInput): Promise<TitleIntroGenerationResult>;
};

export type OpenAITitleIntroAdapterConfig = {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
  baseURL?: string;
  proxyUrl?: string;
};
