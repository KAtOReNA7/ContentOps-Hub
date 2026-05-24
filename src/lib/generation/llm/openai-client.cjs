const fs = require("node:fs");
const path = require("node:path");
const OpenAI = require("openai");
const { SocksProxyAgent } = require("socks-proxy-agent");
const { ProxyAgent } = require("undici");
const nodeFetchModule = require("node-fetch");

const DEFAULT_OPENAI_TIMEOUT_MS = 90000;
const DEFAULT_OPENAI_MAX_OUTPUT_TOKENS = 3000;

function loadOpenAIEnvFiles(cwd = process.cwd(), fileNames = [".env", ".env.local"]) {
  for (const fileName of fileNames) {
    loadEnvFile(path.join(cwd, fileName));
  }
}

function createOpenAIClient(config = {}) {
  const apiKey = config.apiKey ?? process.env.OPENAI_API_KEY;
  const model = config.model ?? process.env.OPENAI_TEXT_MODEL;
  const timeoutMs = parsePositiveInteger(config.timeoutMs ?? process.env.OPENAI_TIMEOUT_MS, DEFAULT_OPENAI_TIMEOUT_MS);
  const proxyConfig = createProxyConfig(config.proxyUrl ?? process.env.OPENAI_PROXY_URL);

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for OpenAI requests.");
  }

  if (!model) {
    throw new Error("OPENAI_TEXT_MODEL is required for OpenAI requests.");
  }

  const client = new OpenAI({
    apiKey,
    timeout: timeoutMs,
    ...proxyConfig.clientOptions,
  });

  return {
    client,
    diagnostics: {
      model,
      timeoutMs,
      usingProxy: proxyConfig.usingProxy,
      proxyProtocol: proxyConfig.proxyProtocol,
    },
  };
}

function createProxyConfig(proxyUrl) {
  if (!proxyUrl) {
    return {
      usingProxy: false,
      proxyProtocol: null,
      clientOptions: {},
    };
  }

  const proxyProtocol = parseProxyProtocol(proxyUrl);

  if (proxyProtocol === "http" || proxyProtocol === "https") {
    return {
      usingProxy: true,
      proxyProtocol,
      clientOptions: {
        fetchOptions: {
          dispatcher: new ProxyAgent(proxyUrl),
        },
      },
    };
  }

  const socksAgent = new SocksProxyAgent(proxyUrl);
  const nodeFetch = resolveFetchFunction(nodeFetchModule);

  return {
    usingProxy: true,
    proxyProtocol,
    clientOptions: {
      fetch: (url, init) =>
        nodeFetch(url, {
          ...init,
          agent: socksAgent,
        }),
    },
  };
}

function resolveFetchFunction(fetchModule) {
  if (typeof fetchModule === "function") {
    return fetchModule;
  }

  if (fetchModule && typeof fetchModule.default === "function") {
    return fetchModule.default;
  }

  throw new Error("node-fetch did not export a fetch function.");
}

function parseProxyProtocol(proxyUrl) {
  let parsed;

  try {
    parsed = new URL(proxyUrl);
  } catch {
    throw new Error("OPENAI_PROXY_URL must be a valid URL.");
  }

  const protocol = parsed.protocol.replace(":", "");

  if (protocol === "http" || protocol === "https" || protocol === "socks5" || protocol === "socks5h") {
    return protocol;
  }

  throw new Error("OPENAI_PROXY_URL must start with http://, https://, socks5://, or socks5h://.");
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/u);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex < 1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();

    if (process.env[key]) {
      continue;
    }

    process.env[key] = unquote(rawValue);
  }
}

function unquote(value) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  return value;
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : fallback;
}

function getErrorStatus(error) {
  if (error && typeof error === "object" && "status" in error && typeof error.status === "number") {
    return error.status;
  }

  return null;
}

function getErrorCode(error) {
  if (error && typeof error === "object" && "code" in error) {
    return String(error.code);
  }

  return null;
}

function getErrorDiagnostics(error) {
  const cause = error && typeof error === "object" && "cause" in error ? error.cause : null;
  const causeCode = getErrorCode(cause);
  const causeMessage = cause instanceof Error ? cause.message : null;
  const causeName = cause instanceof Error ? cause.name : null;

  return {
    status: getErrorStatus(error),
    code: getErrorCode(error),
    errorName: error instanceof Error ? error.name : "Error",
    errorMessage: error instanceof Error ? error.message : "Unknown error",
    causeName,
    causeCode,
    causeMessage,
  };
}

function parsePositiveIntegerFromEnv(name, fallback) {
  return parsePositiveInteger(process.env[name], fallback);
}

module.exports = {
  DEFAULT_OPENAI_MAX_OUTPUT_TOKENS,
  DEFAULT_OPENAI_TIMEOUT_MS,
  createOpenAIClient,
  createProxyConfig,
  getErrorDiagnostics,
  getErrorCode,
  getErrorStatus,
  loadOpenAIEnvFiles,
  parsePositiveIntegerFromEnv,
};
