"use client";

import { useEffect, useState } from "react";
import type {
  CoverPromptSuggestion,
  GenerationStrategy,
  IntroVariantSuggestion,
  TitleVariantSuggestion,
} from "@/lib/generation/title-intro-types";

type TitleIntroGenerationView = {
  generationId: string;
  shouldGenerateVariants: boolean;
  strategy: GenerationStrategy;
  strategyReason: string;
  titleVariants: TitleVariantSuggestion[];
  introVariant: IntroVariantSuggestion;
  coverPrompts: CoverPromptSuggestion[];
  risks: string[];
  evidence: string[];
};

type TitleIntroResponse =
  | {
      success: true;
      data: TitleIntroGenerationView | null;
    }
  | {
      success: false;
      message: string;
      errors: string[];
    };

type WorkTitleIntroPanelProps = {
  workId: string;
};

const strategyLabels: Record<GenerationStrategy, string> = {
  keep_original: "保留原名",
  minor_optimization: "轻度优化",
  rename_test: "多书名测试",
  heavy_repackage: "重包装",
};

export function WorkTitleIntroPanel({ workId }: WorkTitleIntroPanelProps) {
  const [generation, setGeneration] = useState<TitleIntroGenerationView | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadGeneration() {
      setIsLoading(true);
      setError("");

      try {
        const payload = await requestTitleIntro(`/api/works/${workId}/title-intro`, "GET");

        if (!cancelled) {
          setGeneration(payload.data);
          setMessage(payload.data ? "已加载最新书名/简介优化结果" : "暂无书名/简介优化结果");
        }
      } catch (caughtError) {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : "读取书名/简介优化结果失败");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadGeneration();

    return () => {
      cancelled = true;
    };
  }, [workId]);

  async function runGeneration() {
    setIsRunning(true);
    setMessage("");
    setError("");

    try {
      const payload = await requestTitleIntro(`/api/works/${workId}/title-intro`, "POST");

      if (!payload.data) {
        throw new Error("generation 结果字段缺失");
      }

      setGeneration(payload.data);
      setMessage("书名/简介优化生成完成");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "网络请求失败");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="font-semibold text-stone-950">书名和简介优化 Mock</h2>
          <p className="mt-1 text-sm text-stone-600">
            状态：{isLoading ? "读取中" : generation ? "已有生成结果" : "暂无书名/简介优化结果"}
          </p>
        </div>
        <button
          className="w-fit rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:bg-stone-300"
          disabled={isRunning}
          onClick={runGeneration}
          type="button"
        >
          {isRunning ? "生成中" : "生成书名/简介建议"}
        </button>
      </div>

      {message ? <p className="mt-4 rounded-md bg-stone-100 px-3 py-2 text-sm text-stone-700">{message}</p> : null}
      {error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {isLoading ? <p className="mt-4 text-sm text-stone-600">加载书名/简介优化结果中...</p> : null}

      {!isLoading && generation ? (
        <div className="mt-5 space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-md border border-stone-200 p-4">
              <p className="text-sm text-stone-500">生成策略</p>
              <p className="mt-2 text-xl font-semibold text-stone-950">{strategyLabels[generation.strategy]}</p>
            </div>
            <div className="rounded-md border border-stone-200 p-4">
              <p className="text-sm text-stone-500">多书名方案</p>
              <p className="mt-2 text-xl font-semibold text-stone-950">
                {generation.shouldGenerateVariants ? "建议生成多书名方案" : "不建议大幅改名"}
              </p>
            </div>
            <div className="rounded-md border border-stone-200 p-4">
              <p className="text-sm text-stone-500">生成记录</p>
              <p className="mt-2 break-all text-sm font-medium text-stone-950">{generation.generationId}</p>
            </div>
          </div>

          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-700">策略说明</p>
            <p className="mt-2 text-sm text-stone-700">{generation.strategyReason || "暂无策略说明"}</p>
          </div>

          <div className="rounded-md border border-stone-200 p-4">
            <p className="font-medium text-stone-950">新书名方案</p>
            {generation.titleVariants.length ? (
              <div className="mt-4 grid gap-3">
                {generation.titleVariants.map((variant, index) => (
                  <div className="rounded-md bg-stone-50 p-4" key={`${variant.title}-${index}`}>
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <h3 className="font-semibold text-stone-950">{variant.title || "未命名方案"}</h3>
                      <span className="w-fit rounded bg-white px-2 py-1 text-xs text-stone-600">
                        {variant.styleTag || "未标注风格"}
                      </span>
                    </div>
                    <dl className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                      <InfoItem label="核心卖点" value={variant.sellingPoint} />
                      <InfoItem label="目标受众" value={variant.targetAudience} />
                      <InfoItem label="推荐理由" value={variant.reason} />
                      <InfoItem label="风险" value={variant.risk} />
                    </dl>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-stone-600">暂无新书名方案。</p>
            )}
          </div>

          <div className="rounded-md border border-stone-200 p-4">
            <p className="font-medium text-stone-950">新版简介</p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-stone-700">
              {generation.introVariant?.intro || "暂无新版简介。"}
            </p>
            <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
              <InfoItem label="生成理由" value={generation.introVariant?.reason} />
              <InfoItem label="风格标签" value={generation.introVariant?.styleTag} />
              <InfoItem label="风险" value={generation.introVariant?.risk} />
            </dl>
          </div>

          <div className="rounded-md border border-stone-200 p-4">
            <p className="font-medium text-stone-950">封面 prompt</p>
            {generation.coverPrompts.length ? (
              <div className="mt-4 grid gap-3">
                {generation.coverPrompts.map((coverPrompt, index) => (
                  <div className="rounded-md bg-stone-50 p-4" key={`${coverPrompt.ratio}-${index}`}>
                    <p className="text-sm font-semibold text-stone-950">比例：{coverPrompt.ratio}</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-700">{coverPrompt.prompt}</p>
                    <dl className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                      <InfoItem label="生成理由" value={coverPrompt.reason} />
                      <InfoItem label="风险" value={coverPrompt.risk} />
                    </dl>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-stone-600">暂无封面 prompt。</p>
            )}
          </div>

          <TextList title="风险点" items={generation.risks} emptyText="暂无明显风险" />
          <TextList title="证据说明" items={generation.evidence} emptyText="暂无证据说明" />
        </div>
      ) : null}

      {!isLoading && !generation ? <p className="mt-4 text-sm text-stone-600">暂无书名/简介优化结果。</p> : null}
    </section>
  );
}

function InfoItem({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-stone-500">{label}</dt>
      <dd className="mt-1 text-stone-700">{value || "-"}</dd>
    </div>
  );
}

function TextList({ title, items, emptyText }: { title: string; items: string[]; emptyText: string }) {
  return (
    <div className="rounded-md border border-stone-200 p-4">
      <p className="font-medium text-stone-950">{title}</p>
      {items.length ? (
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-stone-700">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-stone-600">{emptyText}</p>
      )}
    </div>
  );
}

async function requestTitleIntro(
  url: string,
  method: "GET" | "POST",
): Promise<Extract<TitleIntroResponse, { success: true }>> {
  let response: Response;

  try {
    response = await fetch(url, { method });
  } catch {
    throw new Error("网络请求失败");
  }

  const payload = (await response.json()) as TitleIntroResponse;

  if (!response.ok || !payload.success) {
    throw new Error(formatApiError(response.status, payload));
  }

  if (payload.data && !isGenerationView(payload.data)) {
    throw new Error("generation 结果字段缺失");
  }

  return payload;
}

function formatApiError(status: number, payload: TitleIntroResponse): string {
  if (payload.success) {
    return `HTTP ${status}`;
  }

  return [`HTTP ${status}`, payload.message, payload.errors.join("；")].filter(Boolean).join(" | ");
}

function isGenerationView(value: TitleIntroGenerationView): boolean {
  return Boolean(
    value.generationId &&
      typeof value.shouldGenerateVariants === "boolean" &&
      value.strategy &&
      typeof value.strategyReason === "string" &&
      Array.isArray(value.titleVariants) &&
      value.introVariant &&
      Array.isArray(value.coverPrompts) &&
      Array.isArray(value.risks) &&
      Array.isArray(value.evidence),
  );
}
