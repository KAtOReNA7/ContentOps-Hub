import { StatusBadge } from "@/components/status-badge";

export default async function SettingsPage() {
  const settings = buildSettings();
  const operationalSettings = buildOperationalSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-950">系统配置状态</h1>
        <p className="mt-2 text-stone-600">
          这里只展示运行状态，不显示 API Key、Token 或任何敏感值。OpenAI 仅在用户手动选择时调用，不默认批量执行。
        </p>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-stone-700">运营视图</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          {operationalSettings.map((setting) => <SettingCard key={setting.key} setting={setting} />)}
        </div>
      </section>

      <details className="rounded-lg border border-stone-200 bg-white p-5">
        <summary className="cursor-pointer font-semibold text-stone-950">技术视图：环境变量状态</summary>
      <section className="mt-4 grid gap-4 md:grid-cols-2">
        {settings.map((setting) => (
          <SettingCard key={setting.key} setting={setting} />
        ))}
      </section>
      </details>
    </div>
  );
}

function buildSettings() {
  const apiKeyConfigured = Boolean(process.env.OPENAI_API_KEY);
  const baseUrl = process.env.OPENAI_BASE_URL?.trim();
  const proxyUrl = process.env.OPENAI_PROXY_URL?.trim();
  const searchBaseUrl = process.env.SEARCH_BASE_URL?.trim();
  const searchProvider = process.env.SEARCH_PROVIDER?.trim() || "mock";

  return [
    {
      description: "默认 mock；real/custom 仅在单本作品识别时手动触发，不做批量搜索。",
      key: "search-provider",
      label: "SEARCH_PROVIDER",
      tone: searchProvider === "mock" ? "stone" : "blue",
      value: searchProvider,
    },
    {
      description: "只判断是否存在，不展示任何前缀或后缀。",
      key: "search-key",
      label: "SEARCH_API_KEY",
      tone: process.env.SEARCH_API_KEY ? "green" : "amber",
      value: process.env.SEARCH_API_KEY ? "已配置" : "未配置",
    },
    {
      description: "真实搜索 API 根地址或查询入口；页面只显示 host。",
      key: "search-base-url",
      label: "SEARCH_BASE_URL",
      tone: searchBaseUrl ? "blue" : "stone",
      value: searchBaseUrl ? safeHostLabel(searchBaseUrl) : "未配置",
    },
    {
      description: "单次搜索请求 timeout。",
      key: "search-timeout",
      label: "SEARCH_TIMEOUT_MS",
      tone: "stone",
      value: process.env.SEARCH_TIMEOUT_MS || "30000",
    },
    {
      description: "单本识别最多读取的搜索结果数量。",
      key: "search-max-results",
      label: "SEARCH_MAX_RESULTS",
      tone: "stone",
      value: process.env.SEARCH_MAX_RESULTS || "10",
    },
    {
      description: "只判断是否存在，不展示任何前缀或后缀。",
      key: "openai-key",
      label: "OpenAI API Key",
      tone: apiKeyConfigured ? "green" : "amber",
      value: apiKeyConfigured ? "已配置" : "未配置",
    },
    {
      description: "支持官方 OpenAI 或兼容中转站，页面只显示 host。",
      key: "openai-base-url",
      label: "OpenAI Base URL",
      tone: baseUrl ? "blue" : "stone",
      value: baseUrl ? baseUrlHostLabel(baseUrl) : "未配置",
    },
    {
      description: "文本生成接口模式。",
      key: "openai-text-endpoint",
      label: "OPENAI_TEXT_ENDPOINT",
      tone: process.env.OPENAI_TEXT_ENDPOINT ? "blue" : "stone",
      value: process.env.OPENAI_TEXT_ENDPOINT || "未配置",
    },
    {
      description: "文本生成模型名可显示，便于排查模型权限和延迟。",
      key: "openai-text-model",
      label: "OPENAI_TEXT_MODEL",
      tone: process.env.OPENAI_TEXT_MODEL ? "green" : "amber",
      value: process.env.OPENAI_TEXT_MODEL || "未配置",
    },
    {
      description: "图片重绘模型名可显示；不会自动批量调用。",
      key: "openai-image-model",
      label: "OPENAI_IMAGE_MODEL",
      tone: process.env.OPENAI_IMAGE_MODEL ? "green" : "amber",
      value: process.env.OPENAI_IMAGE_MODEL || "未配置",
    },
    {
      description: "只显示协议类型，不展示代理 host、端口或账号信息。",
      key: "openai-proxy",
      label: "OPENAI_PROXY_URL",
      tone: proxyUrl ? "blue" : "stone",
      value: proxyUrl ? proxyProtocolLabel(proxyUrl) : "未启用",
    },
    {
      description: "图片生成必须由用户在单个作品中手动确认成本后触发。",
      key: "batch-image",
      label: "批量图片生成",
      tone: "stone",
      value: "默认关闭",
    },
    {
      description: "本地 SQLite 数据库通过 Prisma Client 访问。",
      key: "database",
      label: "数据库",
      tone: "green",
      value: "SQLite + Prisma",
    },
    {
      description: "Mock-first，本地优先；OpenAI 文本和图片均保持手动触发。",
      key: "cost-policy",
      label: "成本策略",
      tone: "green",
      value: "手动触发",
    },
  ] as const;
}

function baseUrlHostLabel(value: string): string {
  try {
    const url = new URL(value);
    return url.hostname.includes("api.openai.com") ? "官方 OpenAI" : `中转站 ${url.hostname}`;
  } catch {
    return "已配置";
  }
}

function SettingCard({ setting }: { setting: { description: string; key: string; label: string; tone: "stone" | "green" | "amber" | "blue"; value: string } }) {
  return <div className="rounded-lg border border-stone-200 bg-white p-5"><div className="flex items-start justify-between gap-4"><div><h3 className="font-semibold text-stone-950">{setting.label}</h3><p className="mt-2 text-sm text-stone-600">{setting.description}</p></div><StatusBadge tone={setting.tone}>{setting.value}</StatusBadge></div></div>;
}

function buildOperationalSettings() {
  const searchProvider = process.env.SEARCH_PROVIDER?.trim() || "mock";
  return [
    { key: "op-search", label: "真实搜索", value: searchProvider === "mock" ? "未启用" : "已启用", tone: searchProvider === "mock" ? "stone" : "green", description: "默认保持 Mock；真实搜索只在用户主动触发时调用。" },
    { key: "op-search-service", label: "搜索服务", value: searchProvider === "mock" ? "Mock" : searchProvider === "real" ? "百度千帆 / 已配置服务" : "自定义", tone: "blue", description: "显示当前识别搜索来源，不显示密钥。" },
    { key: "op-search-key", label: "搜索密钥", value: process.env.SEARCH_API_KEY ? "已配置" : "未配置", tone: process.env.SEARCH_API_KEY ? "green" : "amber", description: "只判断是否存在，不展示任何内容。" },
    { key: "op-openai-text", label: "OpenAI 文本生成", value: process.env.OPENAI_API_KEY && process.env.OPENAI_TEXT_MODEL ? "已配置" : "未配置", tone: process.env.OPENAI_API_KEY && process.env.OPENAI_TEXT_MODEL ? "green" : "amber", description: "仅用户主动选择 OpenAI 时调用。" },
    { key: "op-openai-image", label: "OpenAI 图片生成", value: process.env.OPENAI_IMAGE_MODEL ? "已配置" : "未配置", tone: process.env.OPENAI_IMAGE_MODEL ? "green" : "amber", description: "仅单本作品确认成本后手动调用。" },
    { key: "op-batch-image", label: "批量图片生成", value: "默认关闭", tone: "stone", description: "避免图片生成 API 成本失控。" },
    { key: "op-cost", label: "成本策略", value: "手动触发", tone: "green", description: "真实搜索、OpenAI 文本和图片均不默认批量执行。" },
  ] as const;
}

function safeHostLabel(value: string): string {
  try {
    return new URL(value).host;
  } catch {
    return "已配置";
  }
}

function proxyProtocolLabel(value: string): string {
  try {
    return new URL(value).protocol.replace(":", "") || "已启用";
  } catch {
    return "已启用";
  }
}
