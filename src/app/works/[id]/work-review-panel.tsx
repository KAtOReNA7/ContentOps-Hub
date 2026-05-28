"use client";

import { useEffect, useMemo, useState } from "react";

type ReviewStatus = "pending_review" | "approved" | "rejected" | "on_hold" | "needs_revision";

type ReviewData = {
  reviewStatus: ReviewStatus;
  finalTitle: string | null;
  finalIntro: string | null;
  finalCoverUrl: string | null;
  finalCoverAssetId: string | null;
  finalCoverRenderId: string | null;
  finalCoverSource: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  reviewerName: string | null;
};

type SuggestionOption = {
  label: string;
  value: string;
};

type CoverOption = {
  label: string;
  source: string;
  coverAssetId: string | null;
  coverRenderId: string | null;
  url: string;
};

type ReviewResponse =
  | {
      success: true;
      data: {
        review: ReviewData;
        suggestions: {
          titles: SuggestionOption[];
          intros: SuggestionOption[];
          covers: CoverOption[];
        };
      };
    }
  | {
      success: false;
      message: string;
      errors: string[];
    };

type SaveReviewResponse =
  | {
      success: true;
      data: ReviewData;
    }
  | {
      success: false;
      message: string;
      errors: string[];
    };

type WorkReviewPanelProps = {
  workId: string;
};

const statusLabels: Record<ReviewStatus, string> = {
  pending_review: "待审核",
  approved: "已采用",
  rejected: "已退回",
  on_hold: "暂缓",
  needs_revision: "需修改",
};

export function WorkReviewPanel({ workId }: WorkReviewPanelProps) {
  const [review, setReview] = useState<ReviewData | null>(null);
  const [titleOptions, setTitleOptions] = useState<SuggestionOption[]>([]);
  const [introOptions, setIntroOptions] = useState<SuggestionOption[]>([]);
  const [coverOptions, setCoverOptions] = useState<CoverOption[]>([]);
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>("pending_review");
  const [finalTitle, setFinalTitle] = useState("");
  const [finalIntro, setFinalIntro] = useState("");
  const [selectedCoverUrl, setSelectedCoverUrl] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadReview() {
      setIsLoading(true);
      setError("");

      try {
        const payload = await requestReview(`/api/works/${workId}/review`, "GET");

        if (cancelled) {
          return;
        }

        setReview(payload.data.review);
        setTitleOptions(payload.data.suggestions.titles);
        setIntroOptions(payload.data.suggestions.intros);
        setCoverOptions(payload.data.suggestions.covers);
        hydrateForm(payload.data.review);
      } catch (caughtError) {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : "读取审核结果失败");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadReview();

    return () => {
      cancelled = true;
    };
  }, [workId]);

  const selectedCover = useMemo(
    () => coverOptions.find((option) => option.url === selectedCoverUrl) ?? null,
    [coverOptions, selectedCoverUrl],
  );

  function hydrateForm(nextReview: ReviewData) {
    setReviewStatus(nextReview.reviewStatus);
    setFinalTitle(nextReview.finalTitle ?? "");
    setFinalIntro(nextReview.finalIntro ?? "");
    setSelectedCoverUrl(nextReview.finalCoverUrl ?? "");
    setReviewNote(nextReview.reviewNote ?? "");
    setReviewerName(nextReview.reviewerName ?? "");
  }

  async function saveReview() {
    setIsSaving(true);
    setMessage("");
    setError("");

    try {
      const payload = await requestSaveReview(`/api/works/${workId}/review`, {
        reviewStatus,
        finalTitle,
        finalIntro,
        finalCoverUrl: selectedCover?.url ?? selectedCoverUrl,
        finalCoverAssetId: selectedCover?.coverAssetId ?? null,
        finalCoverRenderId: selectedCover?.coverRenderId ?? null,
        finalCoverSource: selectedCover?.source ?? null,
        reviewNote,
        reviewerName,
      });

      setReview(payload.data);
      hydrateForm(payload.data);
      setMessage("审核结果已保存");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "保存审核结果失败");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="font-semibold text-stone-950">最终采用结果 / 人工审核</h2>
          <p className="mt-1 text-sm text-stone-600">
            当前状态：{isLoading ? "读取中" : statusLabels[reviewStatus]}
            {review?.reviewedAt ? ` | 审核时间：${new Date(review.reviewedAt).toLocaleString("zh-CN")}` : ""}
          </p>
        </div>
        <button
          className="w-fit rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:bg-stone-300"
          disabled={isSaving || isLoading}
          onClick={saveReview}
          type="button"
        >
          {isSaving ? "保存中" : "保存审核结果"}
        </button>
      </div>

      {message ? <p className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p> : null}
      {error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {isLoading ? <p className="mt-4 text-sm text-stone-600">加载审核信息中...</p> : null}

      {!isLoading ? (
        <div className="mt-5 grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-stone-700">审核状态</span>
              <select
                className="rounded-md border border-stone-300 px-3 py-2"
                onChange={(event) => setReviewStatus(event.target.value as ReviewStatus)}
                value={reviewStatus}
              >
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-stone-700">审核人</span>
              <input
                className="rounded-md border border-stone-300 px-3 py-2"
                onChange={(event) => setReviewerName(event.target.value)}
                placeholder="例如：运营A"
                value={reviewerName}
              />
            </label>
          </div>

          <div className="grid gap-3 rounded-md border border-stone-200 p-4">
            <div className="flex flex-wrap gap-2">
              {titleOptions.map((option) => (
                <button
                  className="rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-700 hover:border-red-300 hover:bg-red-50"
                  key={`${option.label}-${option.value}`}
                  onClick={() => setFinalTitle(option.value)}
                  type="button"
                >
                  填入{option.label}
                </button>
              ))}
            </div>
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-stone-700">最终书名</span>
              <input
                className="rounded-md border border-stone-300 px-3 py-2"
                onChange={(event) => setFinalTitle(event.target.value)}
                value={finalTitle}
              />
            </label>
          </div>

          <div className="grid gap-3 rounded-md border border-stone-200 p-4">
            <div className="flex flex-wrap gap-2">
              {introOptions.map((option) => (
                <button
                  className="rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-700 hover:border-red-300 hover:bg-red-50"
                  key={option.label}
                  onClick={() => setFinalIntro(option.value)}
                  type="button"
                >
                  填入{option.label}
                </button>
              ))}
            </div>
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-stone-700">最终简介</span>
              <textarea
                className="min-h-32 rounded-md border border-stone-300 px-3 py-2"
                onChange={(event) => setFinalIntro(event.target.value)}
                value={finalIntro}
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm">
            <span className="font-medium text-stone-700">最终封面</span>
            <select
              className="rounded-md border border-stone-300 px-3 py-2"
              onChange={(event) => setSelectedCoverUrl(event.target.value)}
              value={selectedCoverUrl}
            >
              <option value="">暂不选择封面</option>
              {coverOptions.map((option) => (
                <option key={`${option.source}-${option.url}`} value={option.url}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {selectedCoverUrl ? (
            <div className="rounded-md border border-stone-200 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="最终封面预览" className="max-h-64 rounded-md object-contain" src={selectedCoverUrl} />
            </div>
          ) : null}

          <label className="grid gap-2 text-sm">
            <span className="font-medium text-stone-700">审核备注</span>
            <textarea
              className="min-h-24 rounded-md border border-stone-300 px-3 py-2"
              onChange={(event) => setReviewNote(event.target.value)}
              placeholder="记录采用、暂缓、退回或需修改原因"
              value={reviewNote}
            />
          </label>
        </div>
      ) : null}
    </section>
  );
}

async function requestReview(url: string, method: "GET"): Promise<Extract<ReviewResponse, { success: true }>> {
  const response = await fetch(url, { method });
  const payload = (await response.json()) as ReviewResponse;

  if (!payload.success) {
    throw new Error(payload.message || payload.errors.join("；") || "读取审核结果失败");
  }

  return payload;
}

async function requestSaveReview(
  url: string,
  body: Record<string, unknown>,
): Promise<Extract<SaveReviewResponse, { success: true }>> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as SaveReviewResponse;

  if (!payload.success) {
    throw new Error(payload.message || payload.errors.join("；") || "保存审核结果失败");
  }

  return payload;
}
