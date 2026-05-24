const {
  createOpenAIClient,
  getErrorCode,
  getErrorStatus,
  loadOpenAIEnvFiles,
} = require("../src/lib/generation/llm/openai-client.cjs");

const startedAt = Date.now();

loadOpenAIEnvFiles();
let diagnostics = {
  model: process.env.OPENAI_TEXT_MODEL,
  timeoutMs: Number(process.env.OPENAI_TIMEOUT_MS) || 90000,
  usingProxy: Boolean(process.env.OPENAI_PROXY_URL),
  proxyProtocol: null,
};

async function main() {
  const created = createOpenAIClient();
  const client = created.client;
  diagnostics = created.diagnostics;

  const response = await client.responses.create({
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

  console.log(
    JSON.stringify({
      model: diagnostics.model,
      timeoutMs: diagnostics.timeoutMs,
      usingProxy: diagnostics.usingProxy,
      proxyProtocol: diagnostics.proxyProtocol,
      elapsedMs: Date.now() - startedAt,
      ok: Boolean(response.output_text),
    }),
  );
}

main()
  .catch((error) => {
    const status = getErrorStatus(error);
    const code = getErrorCode(error);
    console.error(
      JSON.stringify({
        errorType: error?.name || "Error",
        message: error?.message || "Unknown error",
        status,
        code,
        timeoutMs: diagnostics.timeoutMs,
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
