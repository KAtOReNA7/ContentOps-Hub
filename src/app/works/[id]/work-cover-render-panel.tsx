"use client";

import { useEffect, useMemo, useState } from "react";
import type { CoverRenderRatio, CoverRenderTitleOption, CoverRenderView } from "@/lib/cover-render/cover-render-types";
import type { CoverEvaluationView, CoverStrategy } from "@/lib/cover/cover-types";

type WorkCoverRenderPanelProps = {
  evaluation: CoverEvaluationView | null;
  workId: string;
};

type CoverRenderStateResponse =
  | {
      success: true;
      data: {
        renders: CoverRenderView[];
        titleOptions: CoverRenderTitleOption[];
        defaultStrategy: CoverStrategy | null;
      };
    }
  | {
      success: false;
      message: string;
      errors: string[];
    };

type CoverRenderResponse =
  | {
      success: true;
      data: {
        renders: CoverRenderView[];
      };
    }
  | {
      success: false;
      message: string;
      errors: string[];
    };

const supportedStrategies = new Set<CoverStrategy>(["keep_and_replace_title", "keep_and_optimize_layout"]);

export function WorkCoverRenderPanel({ evaluation, workId }: WorkCoverRenderPanelProps) {
  const effectiveStrategy = evaluation?.confirmedStrategy ?? evaluation?.strategy ?? null;
  const canRender = effectiveStrategy ? supportedStrategies.has(effectiveStrategy) : false;
  const [renders, setRenders] = useState<CoverRenderView[]>([]);
  const [titleOptions, setTitleOptions] = useState<CoverRenderTitleOption[]>([]);
  const [selectedTitle, setSelectedTitle] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const titleText = manualTitle.trim() || selectedTitle.trim();
  const groupedRenders = useMemo(() => renders.slice(0, 6), [renders]);

  useEffect(() => {
    let cancelled = false;

    async function loadRenders() {
      setIsLoading(true);
      setError("");

      try {
        const payload = await requestJson<CoverRenderStateResponse>(`/api/works/${workId}/cover/render`, { method: "GET" });

        if (!cancelled) {
          setRenders(payload.data.renders);
          setTitleOptions(payload.data.titleOptions);
          setSelectedTitle((current) => current || payload.data.titleOptions[0]?.title || "");
        }
      } catch (caughtError) {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : "读取新版封面记录失败");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadRenders();
    const reloadAfterTitleIntroUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ workId?: string }>).detail;
      if (!detail?.workId || detail.workId === workId) {
        void loadRenders();
      }
    };
    window.addEventListener("title-intro-generation-updated", reloadAfterTitleIntroUpdate);

    return () => {
      cancelled = true;
      window.removeEventListener("title-intro-generation-updated", reloadAfterTitleIntroUpdate);
    };
  }, [workId]);

  async function renderCover() {
    setError("");
    setMessage("");
    setIsRendering(true);

    try {
      if (!effectiveStrategy || !canRender) {
        throw new Error("当前封面策略不支持 V1 程序化生成。");
      }

      if (!titleText) {
        throw new Error("请先选择或输入新版封面标题。");
      }

      const payload = await requestJson<CoverRenderResponse>(`/api/works/${workId}/cover/render`, {
        body: JSON.stringify({
          ratios: ["1:1", "3:4"] satisfies CoverRenderRatio[],
          strategy: effectiveStrategy,
          titleText,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      setRenders([...payload.data.renders, ...renders]);
      setMessage("新版封面生成完成");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "新版封面生成失败");
    } finally {
      setIsRendering(false);
    }
  }

  if (!evaluation) {
    return null;
  }

  return (
    <div className="rounded-md border border-stone-200 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-medium text-stone-950">新版标题封面</p>
          <p className="mt-1 text-sm text-stone-600">
            {canRender ? "保留原封面主体，程序化替换标题并输出 1:1 与 3:4 两版。" : "当前策略为重绘封面，V1 不进行程序化生成。"}
          </p>
        </div>
        <button
          className="w-fit rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:bg-stone-300"
          disabled={!canRender || isRendering}
          onClick={renderCover}
          type="button"
        >
          {isRendering ? "生成中" : "基于原封面生成新版封面"}
        </button>
      </div>

      {canRender ? (
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr]">
          <select
            className="rounded-md border border-stone-300 px-3 py-2 text-sm"
            onChange={(event) => {
              setSelectedTitle(event.target.value);
              setManualTitle("");
            }}
            value={selectedTitle}
          >
            <option value="">选择已生成的新书名</option>
            {titleOptions.map((option, index) => (
              <option key={`${index}-${option.title}`} value={option.title}>
                {option.title}
              </option>
            ))}
          </select>
          <input
            className="rounded-md border border-stone-300 px-3 py-2 text-sm"
            onChange={(event) => setManualTitle(event.target.value)}
            placeholder="或手动输入标题"
            value={manualTitle}
          />
        </div>
      ) : null}

      {message ? <p className="mt-3 rounded-md bg-stone-100 px-3 py-2 text-sm text-stone-700">{message}</p> : null}
      {error ? <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {isLoading ? <p className="text-sm text-stone-600">读取新版封面记录中...</p> : null}
        {groupedRenders.map((render) => (
          <div className="rounded-md border border-stone-200 p-3" key={render.id}>
            <div
              className="rounded-md border border-stone-100 bg-stone-100 bg-cover bg-center"
              style={{
                aspectRatio: render.outputRatio === "1:1" ? "1 / 1" : "3 / 4",
                backgroundImage: `url(${render.outputUrl})`,
              }}
            />
            <div className="mt-3 flex items-center justify-between gap-3 text-sm">
              <div>
                <p className="font-medium text-stone-950">{render.outputRatio}</p>
                <p className="text-stone-600">{render.titleText}</p>
              </div>
              <a
                className="rounded-md border border-stone-300 px-3 py-2 font-medium text-stone-800"
                download
                href={render.outputUrl}
              >
                下载
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

async function requestJson<T extends { success: boolean; message?: string; errors?: string[] }>(
  url: string,
  init: RequestInit,
): Promise<Extract<T, { success: true }>> {
  const response = await fetch(url, init);
  const payload = (await response.json()) as T;

  if (!response.ok || !payload.success) {
    throw new Error([`HTTP ${response.status}`, payload.message, payload.errors?.join("；")].filter(Boolean).join(" | "));
  }

  return payload as Extract<T, { success: true }>;
}
