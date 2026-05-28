import { createRequire } from "node:module";
import OpenAI from "openai";
import type {
  GeneratedCoverImage,
  GenerateCoverImageParams,
  ImageGenerationAdapter,
} from "@/lib/image-generation/image-generation-types";

const require = createRequire(import.meta.url);
const {
  createBaseURLConfig,
  createProxyConfig,
  getErrorDiagnostics,
  isLikelyBaseURLPathError,
  parsePositiveIntegerFromEnv,
} = require("../generation/llm/openai-client.cjs") as {
  createBaseURLConfig: (baseURL?: string) => {
    usingBaseURL: boolean;
    baseURLHost: string | null;
    clientOptions: Record<string, unknown>;
  };
  createProxyConfig: (proxyUrl?: string) => {
    usingProxy: boolean;
    proxyProtocol: string | null;
    clientOptions: Record<string, unknown>;
  };
  getErrorDiagnostics: (error: unknown) => {
    status: number | null;
    code: string | null;
    errorName: string;
    errorMessage: string;
    causeName: string | null;
    causeCode: string | null;
    causeMessage: string | null;
  };
  isLikelyBaseURLPathError: (message: string) => boolean;
  parsePositiveIntegerFromEnv: (name: string, fallback: number) => number;
};

const defaultImageTimeoutMs = 120_000;

type OpenAIImageResponse = {
  data?: Array<{
    b64_json?: string;
    url?: string;
  }>;
};

export class OpenAIImage2ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenAIImage2ConfigurationError";
  }
}

export class OpenAIImage2RequestError extends Error {
  constructor(
    message: string,
    public readonly diagnostics: {
      model: string;
      timeoutMs: number;
      usingBaseURL: boolean;
      baseURLHost: string | null;
      usingProxy: boolean;
      proxyProtocol: string | null;
      status: number | null;
      code: string | null;
      errorName: string;
      causeName: string | null;
      causeCode: string | null;
      causeMessage: string | null;
    },
    cause?: unknown,
  ) {
    super(message, { cause });
    this.name = "OpenAIImage2RequestError";
  }
}

export class OpenAIImage2Adapter implements ImageGenerationAdapter {
  async generateCoverImage(params: GenerateCoverImageParams): Promise<GeneratedCoverImage> {
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_IMAGE_MODEL;

    if (!apiKey) {
      throw new OpenAIImage2ConfigurationError("OPENAI_API_KEY is required when provider is chatgpt_image2.");
    }

    if (!model) {
      throw new OpenAIImage2ConfigurationError("OPENAI_IMAGE_MODEL is required when provider is chatgpt_image2.");
    }

    const timeoutMs = parsePositiveIntegerFromEnv("OPENAI_IMAGE_TIMEOUT_MS", defaultImageTimeoutMs);
    const baseURLConfig = createBaseURLConfig(process.env.OPENAI_BASE_URL);
    const proxyConfig = createProxyConfig(process.env.OPENAI_PROXY_URL);
    const client = new OpenAI({
      apiKey,
      timeout: timeoutMs,
      ...baseURLConfig.clientOptions,
      ...proxyConfig.clientOptions,
    });
    const diagnostics = {
      model,
      timeoutMs,
      usingBaseURL: baseURLConfig.usingBaseURL,
      baseURLHost: baseURLConfig.baseURLHost,
      usingProxy: proxyConfig.usingProxy,
      proxyProtocol: proxyConfig.proxyProtocol,
    };

    let response: OpenAIImageResponse;

    try {
      response = (await client.images.generate({
        model,
        prompt: params.prompt,
        n: 1,
        size: sizeForRatio(params.ratio),
        quality: "medium",
        output_format: "png",
      } as never)) as OpenAIImageResponse;
    } catch (error) {
      const errorDiagnostics = getErrorDiagnostics(error);
      const errorMessage = isLikelyBaseURLPathError(errorDiagnostics.errorMessage)
        ? `${errorDiagnostics.errorMessage}. OPENAI_BASE_URL 疑似填写了完整接口地址，请改成根 API 地址，例如 https://linkapi.shop/v1。`
        : errorDiagnostics.errorMessage;

      throw new OpenAIImage2RequestError(
        errorMessage,
        {
          ...diagnostics,
          status: errorDiagnostics.status,
          code: errorDiagnostics.code,
          errorName: errorDiagnostics.errorName,
          causeName: errorDiagnostics.causeName,
          causeCode: errorDiagnostics.causeCode,
          causeMessage: errorDiagnostics.causeMessage,
        },
        error,
      );
    }

    const image = response.data?.[0];
    const b64 = image?.b64_json;

    if (!b64) {
      throw new OpenAIImage2RequestError(
        "OpenAI image response did not include b64_json.",
        {
          ...diagnostics,
          status: null,
          code: null,
          errorName: "MissingImageData",
          causeName: null,
          causeCode: null,
          causeMessage: image?.url ? "Image API returned a URL instead of base64 data." : null,
        },
      );
    }

    return {
      provider: "chatgpt_image2",
      ratio: params.ratio,
      titleText: params.titleText,
      prompt: params.prompt,
      imageBytes: Buffer.from(b64, "base64"),
      mimeType: "image/png",
      diagnostics,
    };
  }
}

function sizeForRatio(ratio: GenerateCoverImageParams["ratio"]): "1024x1024" | "1024x1536" {
  return ratio === "1:1" ? "1024x1024" : "1024x1536";
}
