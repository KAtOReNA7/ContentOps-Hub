const {
  createOpenAIClient,
  getBaseURLDiagnostics,
  getErrorCode,
  getErrorStatus,
  isLikelyBaseURLPathError,
  loadOpenAIEnvFiles,
} = require("../src/lib/generation/llm/openai-client.cjs");

const startedAt = Date.now();

loadOpenAIEnvFiles();
const baseURLDiagnostics = getBaseURLDiagnostics();
const textEndpoint = process.env.OPENAI_TEXT_ENDPOINT === "chat_completions" ? "chat_completions" : "responses";
let diagnostics = {
  model: process.env.OPENAI_TEXT_MODEL,
  timeoutMs: Number(process.env.OPENAI_TIMEOUT_MS) || 90000,
  usingBaseURL: baseURLDiagnostics.usingBaseURL,
  baseURLHost: baseURLDiagnostics.baseURLHost,
  textEndpoint,
  usingProxy: Boolean(process.env.OPENAI_PROXY_URL),
  proxyProtocol: null,
};

const titleIntroGenerationJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "shouldGenerateVariants",
    "strategy",
    "strategyReason",
    "titleVariants",
    "introVariant",
    "coverPrompts",
    "risks",
    "evidence",
  ],
  properties: {
    shouldGenerateVariants: { type: "boolean" },
    strategy: {
      type: "string",
      enum: ["keep_original", "minor_optimization", "rename_test", "heavy_repackage"],
    },
    strategyReason: { type: "string" },
    titleVariants: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "sellingPoint", "targetAudience", "reason", "risk", "styleTag"],
        properties: {
          title: { type: "string" },
          sellingPoint: { type: "string" },
          targetAudience: { type: "string" },
          reason: { type: "string" },
          risk: { type: "string" },
          styleTag: { type: "string" },
        },
      },
    },
    introVariant: {
      type: "object",
      additionalProperties: false,
      required: ["intro", "reason", "styleTag", "risk"],
      properties: {
        intro: { type: "string" },
        reason: { type: "string" },
        styleTag: { type: "string" },
        risk: { type: "string" },
      },
    },
    coverPrompts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["ratio", "prompt", "reason", "risk"],
        properties: {
          ratio: { type: "string", enum: ["1:1", "3:4"] },
          prompt: { type: "string" },
          reason: { type: "string" },
          risk: { type: "string" },
        },
      },
    },
    risks: { type: "array", items: { type: "string" } },
    evidence: { type: "array", items: { type: "string" } },
  },
};

const sampleInput = {
  work: {
    id: "openai-title-intro-smoke-test",
    title: "重生后我在都市逆袭",
    author: "测试作者",
    intro: "主角重生回到命运转折点，面对事业低谷和家人误解，重新选择人生方向。",
    category: "都市 重生",
    coverFileName: "sample.jpg",
    remark: "轻量测试输入",
    playCount: null,
    clickRate: null,
    completionRate: null,
  },
  identification: {
    confidence: 0.7,
    finalMatch: null,
    candidates: [],
    risks: [],
    reason: "测试输入",
  },
  rating: {
    rating: "B",
    score: 66,
    confidence: 0.7,
    reasons: ["题材具备基础商业性"],
    risks: ["测试输入信息有限"],
    evidence: ["用于测试 OpenAI title-intro adapter 链路"],
    renameSuggestion: "recommended",
    renameReason: "适合测试更强冲突和爽点表达",
  },
};

async function main() {
  const created = createOpenAIClient();
  const client = created.client;
  diagnostics = {
    ...created.diagnostics,
    textEndpoint,
  };

  const systemPrompt =
    "你是有声书平台的书名、简介和封面包装运营专家。必须按 JSON Schema 返回，不要输出 schema 之外的字段。";
  const userPrompt = `请基于以下输入生成书名、简介和封面 prompt 建议。\n\n${JSON.stringify(sampleInput, null, 2)}`;
  const maxTokens = Number(process.env.OPENAI_TITLE_INTRO_MAX_OUTPUT_TOKENS) || 3000;

  const response =
    diagnostics.textEndpoint === "chat_completions"
      ? await client.chat.completions.create({
          model: diagnostics.model,
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: userPrompt,
            },
          ],
          response_format: {
            type: "json_object",
          },
          max_tokens: maxTokens,
        })
      : await client.responses.create({
          model: diagnostics.model,
          input: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: userPrompt,
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
          max_output_tokens: maxTokens,
        });

  const outputText =
    diagnostics.textEndpoint === "chat_completions"
      ? response.choices?.[0]?.message?.content
      : response.output_text;
  const parsed = JSON.parse(outputText || "{}");

  console.log(
    JSON.stringify({
      model: diagnostics.model,
      timeoutMs: diagnostics.timeoutMs,
      usingBaseURL: diagnostics.usingBaseURL,
      baseURLHost: diagnostics.baseURLHost,
      textEndpoint: diagnostics.textEndpoint,
      usingProxy: diagnostics.usingProxy,
      proxyProtocol: diagnostics.proxyProtocol,
      elapsedMs: Date.now() - startedAt,
      ok: Boolean(outputText),
      titleVariantsCount: Array.isArray(parsed.titleVariants) ? parsed.titleVariants.length : 0,
      hasIntroVariant: Boolean(parsed.introVariant),
      hasCoverPrompts: Array.isArray(parsed.coverPrompts),
    }),
  );
}

main()
  .catch((error) => {
    const message = error?.message || "Unknown error";
    console.error(
      JSON.stringify({
        errorName: error?.name || "Error",
        errorMessage: isLikelyBaseURLPathError(message)
          ? `${message}. OPENAI_BASE_URL 疑似填写了完整接口地址，请改成根 API 地址，例如 https://linkapi.shop/v1。`
          : message,
        status: getErrorStatus(error),
        code: getErrorCode(error),
        timeoutMs: diagnostics.timeoutMs,
        usingBaseURL: diagnostics.usingBaseURL,
        baseURLHost: diagnostics.baseURLHost,
        textEndpoint: diagnostics.textEndpoint,
        usingProxy: diagnostics.usingProxy,
        proxyProtocol: diagnostics.proxyProtocol,
        elapsedMs: Date.now() - startedAt,
      }),
    );
    process.exitCode = 1;
  })
  .finally(() => {
    process.exit(process.exitCode ?? 0);
  });
