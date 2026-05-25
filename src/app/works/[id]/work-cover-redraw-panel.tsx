"use client";

import { useEffect, useMemo, useState } from "react";
import type { CoverRenderRatio } from "@/lib/cover-render/cover-render-types";
import type { CoverEvaluationView } from "@/lib/cover/cover-types";

type WorkCoverRedrawPanelProps = {
  evaluation: CoverEvaluationView | null;
  workId: string;
};

type CoverRedrawRender = {
  id: string;
  ratio: CoverRenderRatio;
  status: "success" | "failed";
  previewUrl: string;
  downloadUrl: string;
  provider: "chatgpt_image2";
  prompt: string;
  errorMessage: string | null;
  titleText: string;
  createdAt: string;
};

type CoverRedrawTitleOption = {
  index: number;
  title: string;
  reason: string;
};

type CoverRedrawStateResponse =
  | {
      success: true;
      data: {
        renders: CoverRedrawRender[];
        titleOptions: CoverRedrawTitleOption[];
        effectiveStrategy: string | null;
      };
    }
  | {
      success: false;
      message: string;
      errors: string[];
    };

type CoverRedrawResponse =
  | {
      success: true;
      data: {
        renders: CoverRedrawRender[];
        warnings: Array<{ code: string; message: string }>;
      };
    }
  | {
      success: false;
      message: string;
      errors: string[];
    };

const ratioOptions: Array<{ value: CoverRenderRatio; label: string }> = [
  { value: "1:1", label: "1:1 方图" },
  { value: "3:4", label: "3:4 竖图" },
];

export function WorkCoverRedrawPanel({ evaluation, workId }: WorkCoverRedrawPanelProps) {
  const effectiveStrategy = evaluation?.confirmedStrategy ?? evaluation?.strategy ?? null;
  const shouldShow = effectiveStrategy === "redraw_cover";
  const [renders, setRenders] = useState<CoverRedrawRender[]>([]);
  const [titleOptions, setTitleOptions] = useState<CoverRedrawTitleOption[]>([]);
  const [selectedTitleIndex, setSelectedTitleIndex] = useState<number | null>(null);
  const [manualTitle, setManualTitle] = useState("");
  const [selectedRatios, setSelectedRatios] = useState<CoverRenderRatio[]>(["1:1", "3:4"]);
  const [costConfirmed, setCostConfirmed] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const titleText = manualTitle.trim() || (selectedTitleIndex === null ? "" : titleOptions[selectedTitleIndex]?.title ?? "");
  const visibleRenders = useMemo(() => renders.slice(0, 8), [renders]);

  useEffect(() => {
    let cancelled = false;

    async function loadRedrawState() {
      setIsLoading(true);
      setError("");

      try {
        const payload = await requestJson<CoverRedrawStateResponse>(`/api/works/${workId}/cover/redraw`, { method: "GET" });

        if (!cancelled) {
          setRenders(payload.data.renders);
          setTitleOptions(payload.data.titleOptions);
          setSelectedTitleIndex((current) => current ?? payload.data.titleOptions[0]?.index ?? null);
        }
      } catch (caughtError) {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : "读取重绘记录失败");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadRedrawState();

    return () => {
      cancelled = true;
    };
  }, [workId]);

  async function redrawCover() {
    setError("");
    setMessage("");
    setIsGenerating(true);

    try {
      if (!titleText) {
        throw new Error("请先选择或输入重绘封面标题。");
      }

      if (!selectedRatios.length) {
        throw new Error("请至少选择一种输出比例。");
      }

      if (!costConfirmed) {
        throw new Error("请先确认成本提醒。");
      }

      const payload = await requestJson<CoverRedrawResponse>(`/api/works/${workId}/cover/redraw`, {
        body: JSON.stringify({
          confirmCost: true,
          ratios: selectedRatios,
          titleSuggestionIndex: manualTitle.trim() ? undefined : selectedTitleIndex,
          titleText: manualTitle.trim() || undefined,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      setRenders([...payload.data.renders, ...renders]);
      setMessage(
        [
          "重绘请求已完成",
          ...payload.data.warnings.map((warning) => warning.message),
          payload.data.renders.some((render) => render.status === "failed") ? "部分比例生成失败，请查看错误信息。" : "",
        ]
          .filter(Boolean)
          .join("；"),
      );
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "重新绘制封面失败");
    } finally {
      setIsGenerating(false);
    }
  }

  if (!evaluation || !shouldShow) {
    return null;
  }

  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-medium text-stone-950">重新绘制封面</p>
          <p className="mt-1 text-sm text-stone-700">
            当前策略为重绘封面。该操作会调用 ChatGPT Image2，默认分别生成 1:1 和 3:4 两张图。
          </p>
        </div>
        <button
          className="w-fit rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white disabled:bg-stone-300"
          disabled={isGenerating || !costConfirmed}
          onClick={redrawCover}
          type="button"
        >
          {isGenerating ? "重绘中" : "确认并重新绘制"}
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr]">
        <select
          className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
          onChange={(event) => {
            const value = event.target.value;
            setSelectedTitleIndex(value === "" ? null : Number(value));
            setManualTitle("");
          }}
          value={selectedTitleIndex ?? ""}
        >
          <option value="">选择已生成的新书名</option>
          {titleOptions.map((option) => (
            <option key={`${option.index}-${option.title}`} value={option.index}>
              {option.title}
            </option>
          ))}
        </select>
        <input
          className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
          onChange={(event) => setManualTitle(event.target.value)}
          placeholder="或手动输入重绘封面标题"
          value={manualTitle}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-sm text-stone-800">
        {ratioOptions.map((option) => (
          <label className="inline-flex items-center gap-2" key={option.value}>
            <input
              checked={selectedRatios.includes(option.value)}
              onChange={(event) => {
                setSelectedRatios((current) =>
                  event.target.checked
                    ? Array.from(new Set([...current, option.value]))
                    : current.filter((ratio) => ratio !== option.value),
                );
              }}
              type="checkbox"
            />
            {option.label}
          </label>
        ))}
      </div>

      <label className="mt-4 flex gap-3 rounded-md border border-red-200 bg-white p-3 text-sm text-stone-700">
        <input checked={costConfirmed} onChange={(event) => setCostConfirmed(event.target.checked)} type="checkbox" />
        <span>
          我已确认：本操作会真实调用 ChatGPT Image2 并可能产生费用；不会批量自动生成，只对当前作品和所选比例执行。
        </span>
      </label>

      {message ? <p className="mt-3 rounded-md bg-white px-3 py-2 text-sm text-stone-700">{message}</p> : null}
      {error ? <p className="mt-3 rounded-md bg-white px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {isLoading ? <p className="text-sm text-stone-600">读取重绘记录中...</p> : null}
        {visibleRenders.map((render) => (
          <div className="rounded-md border border-stone-200 bg-white p-3" key={render.id}>
            {render.status === "success" ? (
              <div
                className="rounded-md border border-stone-100 bg-stone-100 bg-cover bg-center"
                style={{
                  aspectRatio: render.ratio === "1:1" ? "1 / 1" : "3 / 4",
                  backgroundImage: `url(${render.previewUrl})`,
                }}
              />
            ) : (
              <div className="flex aspect-square items-center justify-center rounded-md border border-red-100 bg-red-50 p-4 text-center text-sm text-red-700">
                生成失败：{render.errorMessage || "未知错误"}
              </div>
            )}
            <div className="mt-3 flex items-center justify-between gap-3 text-sm">
              <div>
                <p className="font-medium text-stone-950">
                  {render.ratio} · {render.provider}
                </p>
                <p className="text-stone-600">{render.titleText}</p>
              </div>
              {render.status === "success" ? (
                <a
                  className="rounded-md border border-stone-300 px-3 py-2 font-medium text-stone-800"
                  download
                  href={render.downloadUrl}
                >
                  下载
                </a>
              ) : null}
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

