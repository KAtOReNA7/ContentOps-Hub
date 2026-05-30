"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { StatusBadge, batchStatusLabel, batchStatusTone } from "@/components/status-badge";

type BatchJobProgress = {
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
  items?: Array<{ updatedAt: string }>;
};

type BatchJobProgressModalProps = {
  jobId: string | null;
  onClose: () => void;
};

const finishedStatuses = new Set(["success", "failed", "partial_success", "canceled"]);

export function BatchJobProgressModal({ jobId, onClose }: BatchJobProgressModalProps) {
  const [job, setJob] = useState<BatchJobProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;

    let active = true;
    let timer: number | null = null;

    async function loadProgress() {
      try {
        const response = await fetch(`/api/batch-jobs/${jobId}`, { cache: "no-store" });
        const payload = (await response.json()) as { success: boolean; data?: BatchJobProgress; message?: string; errors?: string[] };

        if (!response.ok || !payload.success || !payload.data) {
          throw new Error([payload.message || `HTTP ${response.status}`, ...(payload.errors || [])].join(" | "));
        }

        if (!active) return;
        setJob(payload.data);
        setError(null);

        if (!finishedStatuses.has(payload.data.status)) {
          timer = window.setTimeout(() => void loadProgress(), 2_000);
        }
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "读取批量任务进度失败。");
        timer = window.setTimeout(() => void loadProgress(), 2_000);
      }
    }

    void loadProgress();

    return () => {
      active = false;
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [jobId]);

  const completedCount = (job?.successCount ?? 0) + (job?.failedCount ?? 0) + (job?.skippedCount ?? 0);
  const progress = job?.totalCount ? Math.round((completedCount / job.totalCount) * 100) : 0;
  const lastUpdatedAt = useMemo(() => {
    const candidates = [job?.finishedAt, job?.startedAt, job?.createdAt, ...(job?.items?.map((item) => item.updatedAt) ?? [])]
      .filter((value): value is string => Boolean(value))
      .sort();

    return candidates.at(-1) ?? null;
  }, [job]);

  if (!jobId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 p-4">
      <section className="w-full max-w-2xl rounded-lg border border-stone-200 bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-stone-950">批量任务进度</h2>
            <p className="mt-1 text-sm text-stone-600">关闭弹窗不会取消任务，可在批量任务中心继续查看。</p>
          </div>
          <button className="rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-50" onClick={onClose} type="button">
            关闭
          </button>
        </div>

        {error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="text-sm text-stone-600">任务类型：{job ? stepLabel(job.type) : "读取中"}</span>
          <StatusBadge tone={batchStatusTone(job?.status ?? "pending")}>{batchStatusLabel(job?.status ?? "pending")}</StatusBadge>
        </div>

        <div className="mt-4 h-3 overflow-hidden rounded-full bg-stone-100">
          <div className="h-full rounded-full bg-red-600 transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 text-right text-sm font-semibold text-stone-950">{progress}%</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-5">
          <Metric label="总数" value={job?.totalCount ?? 0} />
          <Metric label="已完成" value={completedCount} />
          <Metric label="成功" value={job?.successCount ?? 0} />
          <Metric label="失败" value={job?.failedCount ?? 0} />
          <Metric label="跳过" value={job?.skippedCount ?? 0} />
        </div>

        <p className="mt-4 text-xs text-stone-500">最近更新时间：{lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleString("zh-CN") : "-"}</p>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Link className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-red-700" href="/analysis">
            查看批量任务中心
          </Link>
          <button className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50" onClick={onClose} type="button">
            关闭
          </button>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-stone-950">{value}</p>
    </div>
  );
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
