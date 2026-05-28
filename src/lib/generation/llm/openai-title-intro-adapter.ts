import { createRequire } from "node:module";
import type OpenAI from "openai";
import { z } from "zod";

import { titleIntroGenerationJsonSchema } from "@/lib/generation/llm/title-intro-json-schema";
import type {
  OpenAITitleIntroAdapterConfig,
  TitleIntroLlmAdapter,
} from "@/lib/generation/llm/title-intro-llm-types";
import type {
  TitleIntroGenerationInput,
  TitleIntroGenerationResult,
} from "@/lib/generation/title-intro-types";

const strategySchema = z.enum(["keep_original", "minor_optimization", "rename_test", "heavy_repackage"]);

const titleVariantSchema = z
  .object({
    title: z.string(),
    sellingPoint: z.string(),
    targetAudience: z.string(),
    reason: z.string(),
    risk: z.string(),
    styleTag: z.string(),
  })
  .strict();

const introVariantSchema = z
  .object({
    intro: z.string(),
    reason: z.string(),
    styleTag: z.string(),
    risk: z.string(),
  })
  .strict();

const coverPromptSchema = z
  .object({
    ratio: z.enum(["1:1", "3:4"]),
    prompt: z.string(),
    reason: z.string(),
    risk: z.string(),
  })
  .strict();

export const titleIntroGenerationResultSchema = z
  .object({
    shouldGenerateVariants: z.boolean(),
    strategy: strategySchema,
    strategyReason: z.string(),
    titleVariants: z.array(titleVariantSchema),
    introVariant: introVariantSchema,
    coverPrompts: z.array(coverPromptSchema),
    risks: z.array(z.string()),
    evidence: z.array(z.string()),
  })
  .strict();

const systemPrompt = [
  "你是有声书平台的书名、简介和封面包装运营专家。",
  "根据作品信息、识别结果、评级结果，生成多书名运营建议。",
  "必须严格遵守输出 JSON Schema，不要输出 schema 之外的字段。",
  "不允许编造与作品完全无关的题材。",
  "不允许生成低俗、擦边、违法、血腥猎奇标题。",
  "不允许生成平台名。",
  "简介不能出现“欢迎收听”。",
  "简介建议 100-180 字。",
  "封面 prompt 只生成文字提示，不生成图片。",
  "输出要适合中文有声小说运营场景。",
].join("\n");

export const DEFAULT_OPENAI_TIMEOUT_MS = 90_000;

type OpenAIClientDiagnostics = {
  model: string;
  timeoutMs: number;
  usingBaseURL: boolean;
  baseURLHost: string | null;
  usingProxy: boolean;
  proxyProtocol: string | null;
};

type OpenAIClientFactory = (config?: OpenAITitleIntroAdapterConfig) => {
  client: OpenAI;
  diagnostics: OpenAIClientDiagnostics;
};

const require = createRequire(import.meta.url);
const {
  DEFAULT_OPENAI_MAX_OUTPUT_TOKENS,
  createOpenAIClient,
  getErrorDiagnostics,
  isLikelyBaseURLPathError,
  parsePositiveIntegerFromEnv,
} = require("./openai-client.cjs") as {
  DEFAULT_OPENAI_MAX_OUTPUT_TOKENS: number;
  createOpenAIClient: OpenAIClientFactory;
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

type OpenAITextEndpoint = "responses" | "chat_completions";

export class OpenAITitleIntroTimeoutError extends Error {
  constructor(
    public readonly timeoutMs: number,
    public readonly usingBaseURL: boolean,
    public readonly baseURLHost: string | null,
    public readonly usingProxy: boolean,
    public readonly proxyProtocol: string | null,
    cause?: unknown,
  ) {
    super(
      `OpenAI request timed out after ${timeoutMs} ms. usingBaseURL=${usingBaseURL}, baseURLHost=${baseURLHost ?? "none"}, usingProxy=${usingProxy}, proxyProtocol=${proxyProtocol ?? "none"}. 建议检查 OPENAI_BASE_URL、OPENAI_PROXY_URL、网络、代理、模型延迟，或换用更快模型。`,
      { cause },
    );
    this.name = "OpenAITitleIntroTimeoutError";
  }
}

export class OpenAITitleIntroRequestError extends Error {
  constructor(
    message: string,
    public readonly model: string,
    public readonly timeoutMs: number,
    public readonly usingBaseURL: boolean,
    public readonly baseURLHost: string | null,
    public readonly usingProxy: boolean,
    public readonly proxyProtocol: string | null,
    public readonly status: number | null,
    public readonly code: string | null,
    public readonly errorName: string,
    public readonly causeName: string | null,
    public readonly causeCode: string | null,
    public readonly causeMessage: string | null,
    cause?: unknown,
  ) {
    super(message, { cause });
    this.name = "OpenAITitleIntroRequestError";
  }
}

function buildUserPrompt(input: TitleIntroGenerationInput) {
  return [
    "请基于以下结构化输入生成书名、简介和封面 prompt 建议。",
    "返回值必须与 TitleIntroGenerationResult 完全兼容。",
    JSON.stringify(input, null, 2),
  ].join("\n\n");
}

function resolveTextEndpoint(): OpenAITextEndpoint {
  return process.env.OPENAI_TEXT_ENDPOINT === "chat_completions" ? "chat_completions" : "responses";
}

function parseOpenAIResult(outputText: string): TitleIntroGenerationResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(outputText);
  } catch (error) {
    throw new Error(
      `OpenAI title/intro response is not valid JSON: ${String(error)}. The response may have been truncated; increase OPENAI_TITLE_INTRO_MAX_OUTPUT_TOKENS or ask the model for shorter suggestions.`,
    );
  }

  const validation = titleIntroGenerationResultSchema.safeParse(parsed);

  if (!validation.success) {
    throw new Error(`OpenAI title/intro response failed schema validation: ${validation.error.message}`);
  }

  return validation.data;
}

export async function generateTitleIntroWithOpenAI(
  input: TitleIntroGenerationInput,
  config: OpenAITitleIntroAdapterConfig = {},
): Promise<TitleIntroGenerationResult> {
  const { client, diagnostics } = createOpenAIClient(config);
  const { model, timeoutMs, usingBaseURL, baseURLHost, usingProxy, proxyProtocol } = diagnostics;
  const maxOutputTokens = parsePositiveIntegerFromEnv(
    "OPENAI_TITLE_INTRO_MAX_OUTPUT_TOKENS",
    DEFAULT_OPENAI_MAX_OUTPUT_TOKENS,
  );
  const endpoint = resolveTextEndpoint();
  let outputText = "";

  try {
    outputText =
      endpoint === "chat_completions"
        ? await generateWithChatCompletions(client, model, input, maxOutputTokens)
        : await generateWithResponses(client, model, input, maxOutputTokens);
  } catch (error) {
    if (isTimeoutError(error)) {
      throw new OpenAITitleIntroTimeoutError(timeoutMs, usingBaseURL, baseURLHost, usingProxy, proxyProtocol, error);
    }

    const errorDiagnostics = getErrorDiagnostics(error);
    const message = isLikelyBaseURLPathError(errorDiagnostics.errorMessage)
      ? `${errorDiagnostics.errorMessage}. OPENAI_BASE_URL 疑似填写了完整接口地址，请改成根 API 地址，例如 https://linkapi.shop/v1。`
      : errorDiagnostics.errorMessage;

    throw new OpenAITitleIntroRequestError(
      message,
      model,
      timeoutMs,
      usingBaseURL,
      baseURLHost,
      usingProxy,
      proxyProtocol,
      errorDiagnostics.status,
      errorDiagnostics.code,
      errorDiagnostics.errorName,
      errorDiagnostics.causeName,
      errorDiagnostics.causeCode,
      errorDiagnostics.causeMessage,
      error,
    );
  }

  if (!outputText) {
    throw new Error("OpenAI title/intro response did not include output_text.");
  }

  return parseOpenAIResult(outputText);
}

async function generateWithResponses(
  client: OpenAI,
  model: string,
  input: TitleIntroGenerationInput,
  maxOutputTokens: number,
): Promise<string> {
  const response = await client.responses.create({
    model,
    input: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: buildUserPrompt(input),
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "title_intro_generation_result",
        description: "Structured title, intro, and cover prompt suggestions for Chinese audiobook operations.",
        schema: titleIntroGenerationJsonSchema,
        strict: true,
      },
    },
    max_output_tokens: maxOutputTokens,
  });

  return response.output_text || "";
}

async function generateWithChatCompletions(
  client: OpenAI,
  model: string,
  input: TitleIntroGenerationInput,
  maxOutputTokens: number,
): Promise<string> {
  const response = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: buildUserPrompt(input),
      },
    ],
    response_format: {
      type: "json_object",
    },
    max_tokens: maxOutputTokens,
  });

  return response.choices[0]?.message?.content || "";
}

function isTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const code = "code" in error ? String(error.code) : "";
  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();

  return code.toLowerCase().includes("timeout") || name.includes("timeout") || message.includes("timed out");
}

export class OpenAITitleIntroAdapter implements TitleIntroLlmAdapter {
  constructor(private readonly config: OpenAITitleIntroAdapterConfig = {}) {}

  generate(input: TitleIntroGenerationInput): Promise<TitleIntroGenerationResult> {
    return generateTitleIntroWithOpenAI(input, this.config);
  }
}
