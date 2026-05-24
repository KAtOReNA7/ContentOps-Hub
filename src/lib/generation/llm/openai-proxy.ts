import { createRequire } from "node:module";
import { SocksProxyAgent } from "socks-proxy-agent";
import { ProxyAgent } from "undici";

const require = createRequire(import.meta.url);

export type OpenAIProxyProtocol = "http" | "https" | "socks5" | "socks5h";

export type OpenAIProxyConfig = {
  usingProxy: boolean;
  proxyProtocol: OpenAIProxyProtocol | null;
  clientOptions: {
    fetch?: typeof fetch;
    fetchOptions?: {
      dispatcher?: unknown;
    };
  };
};

export function createOpenAIProxyConfig(proxyUrl = process.env.OPENAI_PROXY_URL): OpenAIProxyConfig {
  if (!proxyUrl) {
    return {
      usingProxy: false,
      proxyProtocol: null,
      clientOptions: {},
    };
  }

  const protocol = parseProxyProtocol(proxyUrl);

  if (protocol === "http" || protocol === "https") {
    return {
      usingProxy: true,
      proxyProtocol: protocol,
      clientOptions: {
        fetchOptions: {
          dispatcher: new ProxyAgent(proxyUrl),
        },
      },
    };
  }

  const socksAgent = new SocksProxyAgent(proxyUrl);
  const nodeFetch = require("node-fetch") as typeof fetch;

  return {
    usingProxy: true,
    proxyProtocol: protocol,
    clientOptions: {
      fetch: ((url, init) =>
        nodeFetch(url, {
          ...init,
          agent: socksAgent,
        } as RequestInit & { agent: typeof socksAgent })) as typeof fetch,
    },
  };
}

function parseProxyProtocol(proxyUrl: string): OpenAIProxyProtocol {
  let parsed: URL;

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
