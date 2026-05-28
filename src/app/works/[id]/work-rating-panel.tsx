"use client";

import { useEffect, useMemo, useState } from "react";
import { StatusBadge, ratingTone } from "@/components/status-badge";
import type { RatingResult, RenameSuggestion } from "@/lib/rating/rating-types";

type RatingView = RatingResult & {
  ratingId: string;
};

type IdentificationStatus = {
  confirmed: boolean;
  confidence: number | null;
  hasIdentification: boolean;
};

type RatingResponse =
  | {
      success: true;
      data: RatingView | null;
    }
  | {
      success: false;
      message: string;
      errors: string[];
    };

type WorkRatingPanelProps = {
  identificationStatus: IdentificationStatus;
  workId: string;
};

const renameSuggestionLabels: Record<RenameSuggestion, string> = {
  avoid: "不建议改名",
  cautious: "谨慎测试",
  recommended: "建议测试",
  strongly_recommended: "强烈建议测试",
};

export function WorkRatingPanel({ identificationStatus, workId }: WorkRatingPanelProps) {
  const [rating, setRating] = useState<RatingView | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const workflowNotice = useMemo(() => ratingWorkflowNotice(identificationStatus, rating), [identificationStatus, rating]);

  useEffect(() => {
    let cancelled = false;

    async function loadRating() {
      setIsLoading(true);
      setError("");

      try {
        const payload = await requestRating(`/api/works/${workId}/rating`, "GET");

        if (!cancelled) {
          setRating(payload.data);
          setMessage(payload.data ? "已加载最新评级结果" : "暂无评级结果");
        }
      } catch (caughtError) {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : "读取评级结果失败");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadRating();

    return () => {
      cancelled = true;
    };
  }, [workId]);

  async function runRating() {
    setIsRunning(true);
    setMessage("");
    setError("");

    try {
      const payload = await requestRating(`/api/works/${workId}/rating`, "POST");

      if (!payload.data) {
        throw new Error("评级结果字段缺失");
      }

      setRating(payload.data);
      setMessage("作品评级完成");
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
          <h2 className="font-semibold text-stone-950">作品价值评级</h2>
          <p className="mt-1 text-sm text-stone-600">
            状态：{isLoading ? "读取中" : rating ? "已有评级结果" : "暂无评级结果"}
          </p>
        </div>
        <button
          className="w-fit rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:bg-stone-300"
          disabled={isRunning}
          onClick={runRating}
          type="button"
        >
          {isRunning ? "评级中..." : "运行评级"}
        </button>
      </div>

      <div className={`mt-4 rounded-md px-3 py-2 text-sm ${workflowNotice.className}`}>{workflowNotice.text}</div>
      {message ? <p className="mt-4 rounded-md bg-stone-100 px-3 py-2 text-sm text-stone-700">{message}</p> : null}
      {error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {isLoading ? <p className="mt-4 text-sm text-stone-600">加载评级结果中...</p> : null}

      {!isLoading && rating ? (
        <div className="mt-5 space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-md border border-stone-200 p-4">
              <p className="text-sm text-stone-500">评级</p>
              <div className="mt-2">
                <StatusBadge tone={ratingTone(rating.rating)}>{rating.rating}</StatusBadge>
                {workflowNotice.isPreRating ? <span className="ml-2"><StatusBadge tone="amber">预评级</StatusBadge></span> : null}
              </div>
            </div>
            <div className="rounded-md border border-stone-200 p-4">
              <p className="text-sm text-stone-500">分数</p>
              <p className="mt-2 text-2xl font-semibold text-stone-950">{rating.score}/100</p>
            </div>
            <div className="rounded-md border border-stone-200 p-4">
              <p className="text-sm text-stone-500">置信度</p>
              <p className="mt-2 text-2xl font-semibold text-stone-950">{Math.round(rating.confidence * 100)}%</p>
            </div>
          </div>

          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-700">多书名运营建议</p>
            <p className="mt-2 font-semibold text-stone-950">{renameSuggestionLabels[rating.renameSuggestion]}</p>
            <p className="mt-2 text-sm text-stone-700">{rating.renameReason}</p>
          </div>

          <RatingList emptyText="暂无评级理由" items={rating.reasons} title="评级理由" />
          <RatingList emptyText="暂无明显风险" items={rating.risks} title="风险点" />
          <RatingList emptyText="暂无证据说明" items={rating.evidence} title="证据说明" />
        </div>
      ) : null}

      {!isLoading && !rating ? <p className="mt-4 text-sm text-stone-600">暂无评级结果。</p> : null}
    </section>
  );
}

function ratingWorkflowNotice(status: IdentificationStatus, rating: RatingView | null) {
  if (!status.hasIdentification) {
    return {
      className: "bg-amber-50 text-amber-800",
      isPreRating: Boolean(rating),
      text: "建议先进行作品识别。未识别时可以运行评级，但结果只适合作为预评级参考。",
    };
  }

  if ((status.confidence ?? 0) < 70 && !status.confirmed) {
    return {
      className: "bg-orange-50 text-orange-800",
      isPreRating: Boolean(rating),
      text: "识别置信度较低，建议人工确认后再参考评级；当前评级请按预评级处理。",
    };
  }

  if (status.confirmed) {
    return {
      className: "bg-green-50 text-green-800",
      isPreRating: false,
      text: "作品身份已确认，评级结果可作为正式运营参考。",
    };
  }

  return {
    className: "bg-stone-100 text-stone-700",
    isPreRating: false,
    text: "已存在作品识别结果。建议在关键作品上人工确认身份后再做最终决策。",
  };
}

function RatingList({ emptyText, items, title }: { emptyText: string; items: string[]; title: string }) {
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

async function requestRating(url: string, method: "GET" | "POST"): Promise<Extract<RatingResponse, { success: true }>> {
  let response: Response;

  try {
    response = await fetch(url, { method });
  } catch {
    throw new Error("网络请求失败");
  }

  const payload = (await response.json()) as RatingResponse;

  if (!response.ok || !payload.success) {
    throw new Error(formatApiError(response.status, payload));
  }

  if (payload.data && !isRatingView(payload.data)) {
    throw new Error("rating 结果字段缺失");
  }

  return payload;
}

function formatApiError(status: number, payload: RatingResponse): string {
  if (payload.success) {
    return `HTTP ${status}`;
  }

  return [`HTTP ${status}`, payload.message, payload.errors.join("；")].filter(Boolean).join(" | ");
}

function isRatingView(value: RatingView): boolean {
  return Boolean(
    value.ratingId &&
      value.rating &&
      typeof value.score === "number" &&
      typeof value.confidence === "number" &&
      Array.isArray(value.reasons) &&
      Array.isArray(value.risks) &&
      Array.isArray(value.evidence) &&
      value.renameSuggestion &&
      value.renameReason,
  );
}
