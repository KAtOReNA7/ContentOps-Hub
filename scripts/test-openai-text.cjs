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

async function main() {
  const created = createOpenAIClient();
  const client = created.client;
  diagnostics = {
    ...created.diagnostics,
    textEndpoint,
  };

  const response =
    diagnostics.textEndpoint === "chat_completions"
      ? await client.chat.completions.create({
          model: diagnostics.model,
          messages: [
            {
              role: "user",
              content: '用 JSON 返回 {"ok": true, "message": "pong"}，不要输出其他文字。',
            },
          ],
          response_format: {
            type: "json_object",
          },
          max_tokens: 80,
        })
      : await client.responses.create({
          model: diagnostics.model,
          input: '用 JSON 返回 {"ok": true, "message": "pong"}，不要输出其他文字。',
          max_output_tokens: 80,
          text: {
            format: {
              type: "json_schema",
              name: "openai_text_ping",
              strict: true,
              schema: {
                type: "object",
                additionalProperties: false,
                required: ["ok", "message"],
                properties: {
                  ok: {
                    type: "boolean",
                  },
                  message: {
                    type: "string",
                  },
                },
              },
            },
          },
        });
  const outputText =
    diagnostics.textEndpoint === "chat_completions"
      ? response.choices?.[0]?.message?.content
      : response.output_text;

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
    }),
  );
}

main()
  .catch((error) => {
    const status = getErrorStatus(error);
    const code = getErrorCode(error);
    const message = error?.message || "Unknown error";
    console.error(
      JSON.stringify({
        errorType: error?.name || "Error",
        message: isLikelyBaseURLPathError(message)
          ? `${message}. OPENAI_BASE_URL 疑似填写了完整接口地址，请改成根 API 地址，例如 https://linkapi.shop/v1。`
          : message,
        status,
        code,
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
