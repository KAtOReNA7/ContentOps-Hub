const fs = require("node:fs");
const path = require("node:path");
const OpenAI = require("openai");
const { SocksProxyAgent } = require("socks-proxy-agent");
const { ProxyAgent } = require("undici");
const nodeFetchModule = require("node-fetch");

const DEFAULT_OPENAI_TIMEOUT_MS = 90000;
const DEFAULT_OPENAI_MAX_OUTPUT_TOKENS = 3000;
const invalidBaseURLPathHints = [
  "/chat/completions",
  "/responses",
  "/images/generations",
  "/images/edits",
];

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
  const baseURLConfig = createBaseURLConfig(config.baseURL ?? process.env.OPENAI_BASE_URL);

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for OpenAI requests.");
  }

  if (!model) {
    throw new Error("OPENAI_TEXT_MODEL is required for OpenAI requests.");
  }

  const client = new OpenAI({
    apiKey,
    timeout: timeoutMs,
    ...baseURLConfig.clientOptions,
    ...proxyConfig.clientOptions,
  });

  return {
    client,
    diagnostics: {
      model,
      timeoutMs,
      usingBaseURL: baseURLConfig.usingBaseURL,
      baseURLHost: baseURLConfig.baseURLHost,
      usingProxy: proxyConfig.usingProxy,
      proxyProtocol: proxyConfig.proxyProtocol,
    },
  };
}

function createBaseURLConfig(baseURL) {
  if (!baseURL) {
    return {
      usingBaseURL: false,
      baseURLHost: null,
      clientOptions: {},
    };
  }

  let parsed;

  try {
    parsed = new URL(baseURL);
  } catch {
    throw new Error("OPENAI_BASE_URL must be a valid URL.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("OPENAI_BASE_URL must start with http:// or https://.");
  }

  const normalizedPath = parsed.pathname.replace(/\/+$/u, "").toLowerCase();
  const invalidPath = invalidBaseURLPathHints.find((pathHint) => normalizedPath.endsWith(pathHint));

  if (invalidPath) {
    throw new Error(
      `OPENAI_BASE_URL 应填写 API 根地址，例如 https://linkapi.shop/v1，不要填写具体接口路径。当前路径疑似包含 ${invalidPath}。`,
    );
  }

  return {
    usingBaseURL: true,
    baseURLHost: parsed.host,
    clientOptions: {
      baseURL,
    },
  };
}

function getBaseURLDiagnostics(baseURL = process.env.OPENAI_BASE_URL) {
  if (!baseURL) {
    return {
      usingBaseURL: false,
      baseURLHost: null,
    };
  }

  try {
    const parsed = new URL(baseURL);

    return {
      usingBaseURL: true,
      baseURLHost: parsed.host,
    };
  } catch {
    return {
      usingBaseURL: true,
      baseURLHost: "invalid",
    };
  }
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

function isLikelyBaseURLPathError(message) {
  return (
    typeof message === "string" &&
    (message.includes("/chat/completions/responses") ||
      message.includes("/chat/completions/images/generations"))
  );
}

function parsePositiveIntegerFromEnv(name, fallback) {
  return parsePositiveInteger(process.env[name], fallback);
}

module.exports = {
  DEFAULT_OPENAI_MAX_OUTPUT_TOKENS,
  DEFAULT_OPENAI_TIMEOUT_MS,
  createBaseURLConfig,
  createOpenAIClient,
  createProxyConfig,
  getBaseURLDiagnostics,
  getErrorDiagnostics,
  getErrorCode,
  getErrorStatus,
  isLikelyBaseURLPathError,
  loadOpenAIEnvFiles,
  parsePositiveIntegerFromEnv,
};
