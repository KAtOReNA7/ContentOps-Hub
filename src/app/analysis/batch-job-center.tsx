"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  StatusBadge,
  batchStatusLabel,
  batchStatusTone,
  coverStrategyLabel,
  generationStrategyLabel,
  providerLabel,
} from "@/components/status-badge";

type BatchJobItemView = {
  id: string;
  workId: string;
  step: string;
  status: string;
  errorMessage: string | null;
  errorCode: string | null;
  resultSummaryJson: string | null;
  retryCount: number;
  startedAt: string | null;
  finishedAt: string | null;
  work: {
    id: string;
    externalId: string | null;
    title: string;
    author: string | null;
  };
};

type BatchJobView = {
  id: string;
  type: string;
  status: string;
  totalCount: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  note: string | null;
  items?: BatchJobItemView[];
};

type BatchJobListResponse = {
  success: boolean;
  data?: {
    jobs: BatchJobView[];
  };
  message?: string;
  errors?: string[];
};

type BatchJobDetailResponse = {
  success: boolean;
  data?: BatchJobView;
  message?: string;
  errors?: string[];
};

export function BatchJobCenter() {
  const [jobs, setJobs] = useState<BatchJobView[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<BatchJobView | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryingItemId, setRetryingItemId] = useState<string | null>(null);

  async function loadJobs() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/batch-jobs", { cache: "no-store" });
      const payload = (await response.json()) as BatchJobListResponse;

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(formatApiError(payload, `HTTP ${response.status}`));
      }

      setJobs(payload.data.jobs);
      setSelectedJobId((current) => current ?? payload.data?.jobs[0]?.id ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "读取批量任务失败。");
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(jobId: string) {
    setDetailLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/batch-jobs/${jobId}`, { cache: "no-store" });
      const payload = (await response.json()) as BatchJobDetailResponse;

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(formatApiError(payload, `HTTP ${response.status}`));
      }

      setSelectedJob(payload.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "读取批量任务详情失败。");
    } finally {
      setDetailLoading(false);
    }
  }

  async function retryItem(itemId: string) {
    if (!selectedJobId) return;

    setRetryingItemId(itemId);
    setError(null);

    try {
      const response = await fetch(`/api/batch-jobs/${selectedJobId}/items/${itemId}/retry`, {
        method: "POST",
      });
      const payload = (await response.json()) as BatchJobDetailResponse;

      if (!response.ok || !payload.success) {
        throw new Error(formatApiError(payload, `HTTP ${response.status}`));
      }

      await loadJobs();
      await loadDetail(selectedJobId);
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : "重试任务项失败。");
    } finally {
      setRetryingItemId(null);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadJobs();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (selectedJobId) {
        void loadDetail(selectedJobId);
      } else {
        setSelectedJob(null);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [selectedJobId]);

  const progress = useMemo(() => {
    if (!selectedJob || selectedJob.totalCount <= 0) return 0;
    return Math.round(((selectedJob.successCount + selectedJob.failedCount + selectedJob.skippedCount) / selectedJob.totalCount) * 100);
  }, [selectedJob]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-950">批量任务中心</h1>
          <p className="mt-2 max-w-3xl text-stone-600">
            对选中作品批量执行识别、评级、书名简介生成和封面评估。V1 采用本地顺序执行，单条失败不会中断整批。
          </p>
        </div>
        <button
          className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-800 hover:border-red-300 hover:bg-red-50 disabled:opacity-50"
          disabled={loading}
          onClick={() => void loadJobs()}
          type="button"
        >
          刷新任务
        </button>
      </div>

      <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        批量真实搜索或 OpenAI 文本生成可能产生外部 API 费用，执行前必须确认成本风险。当前阶段不做批量 Image2 重绘，也不做 OpenAI 视觉评分。
      </section>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.45fr)]">
        <section className="overflow-hidden rounded-lg border border-stone-200 bg-white">
          <div className="border-b border-stone-100 px-4 py-3">
            <h2 className="font-semibold text-stone-950">任务列表</h2>
          </div>
          <div className="divide-y divide-stone-100">
            {jobs.length === 0 ? (
              <div className="p-5 text-sm text-stone-500">暂无批量任务。请在作品列表中勾选作品后创建任务。</div>
            ) : null}
            {jobs.map((job) => (
              <button
                className={`w-full px-4 py-4 text-left transition hover:bg-stone-50 ${
                  selectedJobId === job.id ? "bg-red-50/60" : ""
                }`}
                key={job.id}
                onClick={() => setSelectedJobId(job.id)}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-stone-950">{stepLabel(job.type)}</span>
                      <StatusBadge tone={batchStatusTone(job.status)}>{batchStatusLabel(job.status)}</StatusBadge>
                    </div>
                    <p className="mt-1 text-xs text-stone-500">{formatDate(job.createdAt)}</p>
                  </div>
                  <span className="text-sm text-stone-600">
                    {job.successCount}/{job.totalCount}
                  </span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-stone-100">
                  <div
                    className={`h-2 rounded-full ${progressBarClass(job.status)}`}
                    style={{
                      width: `${job.totalCount ? ((job.successCount + job.failedCount + job.skippedCount) / job.totalCount) * 100 : 0}%`,
                    }}
                  />
                </div>
                <p className="mt-2 text-xs text-stone-500">
                  成功 {job.successCount} / 失败 {job.failedCount} / 跳过 {job.skippedCount}
                </p>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-stone-200 bg-white">
          <div className="border-b border-stone-100 px-4 py-3">
            <h2 className="font-semibold text-stone-950">任务详情</h2>
          </div>
          {!selectedJob ? (
            <div className="p-5 text-sm text-stone-500">{detailLoading ? "正在读取任务详情..." : "请选择一个批量任务。"}</div>
          ) : (
            <div className="space-y-5 p-4">
              <div className="grid gap-3 md:grid-cols-4">
                <SummaryCard label="总数" value={selectedJob.totalCount} />
                <SummaryCard label="成功" value={selectedJob.successCount} />
                <SummaryCard label="失败" value={selectedJob.failedCount} />
                <SummaryCard label="进度" value={`${progress}%`} />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className="bg-stone-50 text-stone-500">
                    <tr>
                      <th className="px-3 py-2">作品</th>
                      <th className="px-3 py-2">步骤</th>
                      <th className="px-3 py-2">状态</th>
                      <th className="px-3 py-2">结果摘要 / 失败原因</th>
                      <th className="px-3 py-2">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedJob.items ?? []).map((item) => (
                      <tr className="border-t border-stone-100 align-top" key={item.id}>
                        <td className="px-3 py-3">
                          <Link className="font-medium text-stone-950 hover:text-red-800" href={`/works/${item.workId}`}>
                            {item.work.title}
                          </Link>
                          <div className="mt-1 text-xs text-stone-500">
                            作者：{item.work.author || "-"} | 作品ID：{item.work.externalId || "-"}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-stone-700">{stepLabel(item.step)}</td>
                        <td className="px-3 py-3">
                          <StatusBadge tone={batchStatusTone(item.status)}>{batchStatusLabel(item.status)}</StatusBadge>
                        </td>
                        <td className="max-w-md px-3 py-3 text-stone-600">
                          {item.status === "failed" ? (
                            <span className="text-red-700">{formatItemError(item.errorMessage, item.errorCode)}</span>
                          ) : (
                            <details>
                              <summary className="cursor-pointer text-stone-700">查看关键结果摘要</summary>
                              <p className="mt-2 leading-6">{formatSummary(item.resultSummaryJson)}</p>
                            </details>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Link className="rounded-md border border-stone-300 px-3 py-1.5 text-xs hover:bg-stone-50" href={`/works/${item.workId}`}>
                              查看作品
                            </Link>
                            {item.status === "failed" ? (
                              <button
                                className="rounded-md bg-stone-900 px-3 py-1.5 text-xs text-white hover:bg-red-700 disabled:opacity-50"
                                disabled={retryingItemId === item.id}
                                onClick={() => void retryItem(item.id)}
                                type="button"
                              >
                                {retryingItemId === item.id ? "重试中" : "重试"}
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
      <div className="text-xs text-stone-500">{label}</div>
      <div className="mt-1 text-xl font-semibold text-stone-950">{value}</div>
    </div>
  );
}

function formatApiError(payload: { message?: string; errors?: string[] }, fallback: string) {
  return [payload.message || fallback, ...(payload.errors || [])].join(" | ");
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString("zh-CN") : "-";
}

function stepLabel(value: string) {
  const labels: Record<string, string> = {
    cover_evaluation: "封面评估",
    identify: "作品识别",
    mixed: "混合任务",
    rating: "价值评级",
    title_intro: "书名简介生成",
  };

  return labels[value] || value;
}

function progressBarClass(value: string) {
  if (value === "success") return "bg-green-500";
  if (value === "running") return "bg-blue-500";
  if (value === "partial_success") return "bg-orange-500";
  if (value === "failed") return "bg-red-500";
  return "bg-stone-400";
}

function formatSummary(value: string | null) {
  if (!value) return "-";

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return Object.entries(parsed)
      .slice(0, 5)
      .map(([key, item]) => `${summaryKeyLabel(key)}：${summaryValueLabel(key, item)}`)
      .join("；");
  } catch {
    return "结果摘要解析失败。";
  }
}

function summaryValueLabel(key: string, value: unknown) {
  if (key === "provider") return providerLabel(String(value ?? ""));
  if (key === "identifyProviderMode") return value === "configured" ? "真实搜索识别" : "Mock 本地识别";
  if (key === "actualSearchProvider") return value === "mock" ? "Mock" : String(value ?? "-");
  if (key === "searchFallback") return value ? "是，本次使用 Mock fallback" : "否";
  if (key === "strategy") {
    const strategy = String(value ?? "");
    const coverLabel = coverStrategyLabel(strategy);
    return coverLabel === strategy ? generationStrategyLabel(strategy) : coverLabel;
  }
  return String(value ?? "-");
}

function summaryKeyLabel(key: string) {
  const labels: Record<string, string> = {
    candidateCount: "候选数",
    actualSearchProvider: "实际搜索来源",
    identifyProviderMode: "识别请求方式",
    confidence: "置信度",
    coverRating: "封面评级",
    coverScore: "封面分",
    generatedCount: "生成数",
    provider: "来源",
    searchFallback: "是否 fallback",
    rating: "评级",
    score: "分数",
    strategy: "策略",
    topCandidateTitle: "首个候选",
  };

  return labels[key] || key;
}

function formatItemError(value: string | null, fallbackCode: string | null) {
  if (!value) return fallbackCode || "任务项失败。";

  try {
    const parsed = JSON.parse(value) as { errorCode?: string; errorMessage?: string; hint?: string };
    return [parsed.errorCode || fallbackCode, parsed.errorMessage, parsed.hint].filter(Boolean).join(" | ");
  } catch {
    return value;
  }
}
