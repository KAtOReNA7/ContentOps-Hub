import { StatusBadge } from "@/components/status-badge";

export default async function SettingsPage() {
  const settings = buildSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-950">系统配置状态</h1>
        <p className="mt-2 text-stone-600">
          这里只展示运行状态，不显示 API Key、Token 或任何敏感值。OpenAI 仅在用户手动选择时调用，不默认批量执行。
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        {settings.map((setting) => (
          <div className="rounded-lg border border-stone-200 bg-white p-5" key={setting.key}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-stone-950">{setting.label}</h2>
                <p className="mt-2 text-sm text-stone-600">{setting.description}</p>
              </div>
              <StatusBadge tone={setting.tone}>{setting.value}</StatusBadge>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function buildSettings() {
  const apiKeyConfigured = Boolean(process.env.OPENAI_API_KEY);
  const baseUrl = process.env.OPENAI_BASE_URL?.trim();
  const proxyUrl = process.env.OPENAI_PROXY_URL?.trim();

  return [
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

function proxyProtocolLabel(value: string): string {
  try {
    return new URL(value).protocol.replace(":", "") || "已启用";
  } catch {
    return "已启用";
  }
}
