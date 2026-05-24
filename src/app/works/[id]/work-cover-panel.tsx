"use client";

import { useEffect, useState } from "react";
import type { CoverAssetView, CoverEvaluationView, CoverStrategy } from "@/lib/cover/cover-types";

type CoverState = {
  asset: CoverAssetView | null;
  evaluation: CoverEvaluationView | null;
};

type CoverStateResponse =
  | {
      success: true;
      data: CoverState;
    }
  | {
      success: false;
      message: string;
      errors: string[];
    };

type CoverEvaluationResponse =
  | {
      success: true;
      data: CoverEvaluationView | null;
      message?: string;
    }
  | {
      success: false;
      message: string;
      errors: string[];
    };

type CoverUploadResponse =
  | {
      success: true;
      data: {
        asset: CoverAssetView;
      };
    }
  | {
      success: false;
      message: string;
      errors: string[];
    };

type WorkCoverPanelProps = {
  workId: string;
};

const strategyLabels: Record<CoverStrategy, string> = {
  keep_and_replace_title: "保留主体，仅替换封面标题",
  keep_and_optimize_layout: "保留主体，优化标题区和版式",
  redraw_cover: "后续进入重新绘制封面",
};

const ratingStyles: Record<string, string> = {
  A: "bg-green-100 text-green-800",
  B: "bg-amber-100 text-amber-800",
  C: "bg-orange-100 text-orange-800",
  D: "bg-stone-900 text-white",
};

export function WorkCoverPanel({ workId }: WorkCoverPanelProps) {
  const [asset, setAsset] = useState<CoverAssetView | null>(null);
  const [evaluation, setEvaluation] = useState<CoverEvaluationView | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [confirmedStrategy, setConfirmedStrategy] = useState<CoverStrategy>("keep_and_optimize_layout");
  const [reviewNote, setReviewNote] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadCoverState() {
      setIsLoading(true);
      setError("");

      try {
        const payload = await readCoverState(workId);

        if (!cancelled) {
          setAsset(payload.asset);
          setEvaluation(payload.evaluation);
          setConfirmedStrategy(payload.evaluation?.confirmedStrategy ?? payload.evaluation?.strategy ?? "keep_and_optimize_layout");
          setReviewNote(payload.evaluation?.reviewNote ?? "");
          setMessage(payload.asset ? "已加载当前封面资产" : "暂无当前封面资产");
        }
      } catch (caughtError) {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : "读取封面状态失败");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadCoverState();

    return () => {
      cancelled = true;
    };
  }, [workId]);

  async function uploadCover() {
    setIsUploading(true);
    setMessage("");
    setError("");

    try {
      if (!selectedFile) {
        throw new Error("请先选择封面图片");
      }

      const formData = new FormData();
      formData.append("file", selectedFile);
      const payload = await requestJson<CoverUploadResponse>(`/api/works/${workId}/cover`, {
        method: "POST",
        body: formData,
      });

      setAsset(payload.data.asset);
      setEvaluation(null);
      setSelectedFile(null);
      setMessage("封面上传完成，请运行封面评估");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "封面上传失败");
    } finally {
      setIsUploading(false);
    }
  }

  async function runEvaluation() {
    setIsEvaluating(true);
    setMessage("");
    setError("");

    try {
      const payload = await requestJson<CoverEvaluationResponse>(`/api/works/${workId}/cover/evaluate`, {
        method: "POST",
      });

      if (!payload.data) {
        throw new Error("封面评估结果为空");
      }

      setEvaluation(payload.data);
      setConfirmedStrategy(payload.data.strategy);
      setReviewNote(payload.data.reviewNote ?? "");
      setMessage("封面评估完成");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "封面评估失败");
    } finally {
      setIsEvaluating(false);
    }
  }

  async function confirmStrategy() {
    setIsConfirming(true);
    setMessage("");
    setError("");

    try {
      if (!evaluation?.evaluationId) {
        throw new Error("请先运行封面评估");
      }

      const payload = await requestJson<CoverEvaluationResponse>(`/api/works/${workId}/cover/confirm`, {
        method: "POST",
        body: JSON.stringify({
          evaluationId: evaluation.evaluationId,
          confirmedStrategy,
          reviewNote,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!payload.data) {
        throw new Error("封面确认结果为空");
      }

      setEvaluation(payload.data);
      setMessage("封面处理策略已人工确认");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "人工确认失败");
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="font-semibold text-stone-950">封面评估与处理建议</h2>
          <p className="mt-1 text-sm text-stone-600">
            状态：{isLoading ? "读取中" : asset ? "已有当前封面" : "暂无当前封面"}
          </p>
        </div>
        <button
          className="w-fit rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:bg-stone-300"
          disabled={isEvaluating || !asset}
          onClick={runEvaluation}
          type="button"
        >
          {isEvaluating ? "评估中" : "运行封面评估"}
        </button>
      </div>

      {message ? <p className="mt-4 rounded-md bg-stone-100 px-3 py-2 text-sm text-stone-700">{message}</p> : null}
      {error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="mt-5 grid gap-5 lg:grid-cols-[260px_1fr]">
        <div className="space-y-4">
          <div
            className="aspect-[3/4] rounded-md border border-stone-200 bg-stone-100 bg-cover bg-center"
            style={asset ? { backgroundImage: `url(${asset.url})` } : undefined}
          >
            {!asset ? (
              <div className="flex h-full items-center justify-center px-4 text-center text-sm text-stone-500">
                上传当前封面后可在此预览
              </div>
            ) : null}
          </div>

          {asset ? (
            <div className="rounded-md bg-stone-50 p-3 text-sm text-stone-600">
              <p className="break-all font-medium text-stone-950">{asset.originalName}</p>
              <p className="mt-1">格式：{asset.mimeType}</p>
              <p>大小：{formatFileSize(asset.sizeBytes)}</p>
            </div>
          ) : null}
        </div>

        <div className="space-y-5">
          <div className="rounded-md border border-dashed border-stone-300 p-4">
            <p className="font-medium text-stone-950">上传 / 更换封面</p>
            <p className="mt-1 text-sm text-stone-600">支持 JPG、PNG、WebP，最大 5MB。上传文件保存在本地 uploads 目录，已加入 Git 忽略。</p>
            <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center">
              <input
                accept="image/jpeg,image/png,image/webp"
                className="block w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                type="file"
              />
              <button
                className="w-fit rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-800 disabled:opacity-50"
                disabled={isUploading || !selectedFile}
                onClick={uploadCover}
                type="button"
              >
                {isUploading ? "上传中" : "上传封面"}
              </button>
            </div>
          </div>

          {evaluation ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-md border border-stone-200 p-4">
                  <p className="text-sm text-stone-500">评分</p>
                  <p className="mt-2 text-2xl font-semibold text-stone-950">{evaluation.score}/100</p>
                </div>
                <div className="rounded-md border border-stone-200 p-4">
                  <p className="text-sm text-stone-500">评级</p>
                  <p className={`mt-2 inline-flex rounded-md px-3 py-1 text-2xl font-semibold ${ratingStyles[evaluation.rating]}`}>
                    {evaluation.rating}
                  </p>
                </div>
                <div className="rounded-md border border-stone-200 p-4">
                  <p className="text-sm text-stone-500">处理策略</p>
                  <p className="mt-2 font-semibold text-stone-950">{strategyLabels[evaluation.strategy]}</p>
                </div>
              </div>

              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-700">策略理由</p>
                <p className="mt-2 text-sm text-stone-700">{evaluation.reason}</p>
              </div>

              <CoverTextList title="优点" items={evaluation.strengths} emptyText="暂无优点记录" />
              <CoverTextList title="问题" items={evaluation.weaknesses} emptyText="暂无问题记录" />

              <div className="rounded-md border border-stone-200 p-4">
                <p className="font-medium text-stone-950">人工确认</p>
                <div className="mt-3 grid gap-3 md:grid-cols-[260px_1fr_auto]">
                  <select
                    className="rounded-md border border-stone-300 px-3 py-2 text-sm"
                    onChange={(event) => setConfirmedStrategy(event.target.value as CoverStrategy)}
                    value={confirmedStrategy}
                  >
                    {Object.entries(strategyLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <input
                    className="rounded-md border border-stone-300 px-3 py-2 text-sm"
                    onChange={(event) => setReviewNote(event.target.value)}
                    placeholder="审核备注"
                    value={reviewNote}
                  />
                  <button
                    className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-800 disabled:opacity-50"
                    disabled={isConfirming}
                    onClick={confirmStrategy}
                    type="button"
                  >
                    {isConfirming ? "确认中" : "确认策略"}
                  </button>
                </div>
                {evaluation.confirmed ? (
                  <p className="mt-3 text-sm text-green-700">
                    已确认：{strategyLabels[evaluation.confirmedStrategy ?? evaluation.strategy]}
                    {evaluation.reviewNote ? `；备注：${evaluation.reviewNote}` : ""}
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="rounded-md bg-stone-50 p-4 text-sm text-stone-600">
              暂无封面评估结果。上传封面后点击“运行封面评估”。
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function CoverTextList({ title, items, emptyText }: { title: string; items: string[]; emptyText: string }) {
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

async function readCoverState(workId: string): Promise<CoverState> {
  const payload = await requestJson<CoverStateResponse>(`/api/works/${workId}/cover`, { method: "GET" });
  return payload.data;
}

async function requestJson<T extends { success: boolean; message?: string; errors?: string[] }>(
  url: string,
  init: RequestInit,
): Promise<Extract<T, { success: true }>> {
  let response: Response;

  try {
    response = await fetch(url, init);
  } catch {
    throw new Error("网络请求失败");
  }

  const payload = (await response.json()) as T;

  if (!response.ok || !payload.success) {
    throw new Error([`HTTP ${response.status}`, payload.message, payload.errors?.join("；")].filter(Boolean).join(" | "));
  }

  return payload as Extract<T, { success: true }>;
}

function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${Math.round(sizeBytes / 1024)} KB`;
  }

  return `${Math.round((sizeBytes / 1024 / 1024) * 10) / 10} MB`;
}
