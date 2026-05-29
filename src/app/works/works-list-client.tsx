"use client";

import Link from "next/link";
import { useState } from "react";
import { StatusBadge, reviewStatusLabel, reviewStatusTone } from "@/components/status-badge";
import { ExportWorksControls } from "@/app/works/export-all-button";

type WorkListItem = {
  author: string | null;
  category: string | null;
  description: string;
  externalId: string | null;
  id: string;
  reviewStatus: string;
  status: string;
  title: string;
};

type WorksListClientProps = {
  exportFilters: {
    author?: string;
    category?: string;
    externalId?: string;
    rating?: string;
    reviewStatus?: string;
    title?: string;
  };
  works: WorkListItem[];
};

export function WorksListClient({ exportFilters, works }: WorksListClientProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [costRiskAccepted, setCostRiskAccepted] = useState(false);
  const [titleIntroProvider, setTitleIntroProvider] = useState<"mock" | "openai">("mock");
  const [batchLoading, setBatchLoading] = useState<string | null>(null);
  const [batchMessage, setBatchMessage] = useState<string | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);
  const allVisibleSelected = works.length > 0 && works.every((work) => selectedIds.includes(work.id));

  function toggleWork(id: string, checked: boolean) {
    setSelectedIds((current) => (checked ? Array.from(new Set([...current, id])) : current.filter((item) => item !== id)));
  }

  function toggleAllVisible(checked: boolean) {
    setSelectedIds((current) =>
      checked
        ? Array.from(new Set([...current, ...works.map((work) => work.id)]))
        : current.filter((id) => !works.some((work) => work.id === id)),
    );
  }

  async function createBatchJob(step: "identify" | "rating" | "title_intro" | "cover_evaluation") {
    if (selectedIds.length === 0) {
      setBatchError("请先选择作品。");
      return;
    }

    setBatchLoading(step);
    setBatchError(null);
    setBatchMessage(null);

    try {
      const response = await fetch("/api/batch-jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: step,
          workIds: selectedIds,
          steps: [step],
          costRiskAccepted,
          titleIntroProvider: step === "title_intro" ? titleIntroProvider : "mock",
          note: `作品列表批量操作：${batchStepLabel(step)}`,
        }),
      });
      const payload = (await response.json()) as {
        success: boolean;
        data?: { id: string };
        message?: string;
        errors?: string[];
      };

      if (!response.ok || !payload.success) {
        throw new Error([payload.message || `HTTP ${response.status}`, ...(payload.errors || [])].join(" | "));
      }

      setBatchMessage(`批量任务已完成创建并执行。任务ID：${payload.data?.id || "-"}`);
    } catch (error) {
      setBatchError(error instanceof Error ? error.message : "创建批量任务失败。");
    } finally {
      setBatchLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      <ExportWorksControls filters={exportFilters} selectedIds={selectedIds} />

      <section className="rounded-lg border border-stone-200 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-stone-950">批量操作</h2>
            <p className="mt-1 text-sm text-stone-600">
              当前已选择 {selectedIds.length} 个作品。批量任务会顺序执行，单条失败不会影响整批。
            </p>
          </div>
          <Link
            className="rounded-md border border-stone-300 px-3 py-2 text-center text-sm font-medium text-stone-800 hover:border-red-300 hover:bg-red-50"
            href="/analysis"
          >
            查看批量任务中心
          </Link>
        </div>

        <div className="mt-4 rounded-md border border-stone-200 bg-stone-50 p-3">
          <div className="text-sm font-medium text-stone-950">书名简介生成方式</div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <label className="flex cursor-pointer gap-2 rounded-md border border-stone-200 bg-white p-3 text-sm text-stone-700 hover:border-red-200">
              <input
                checked={titleIntroProvider === "mock"}
                className="mt-1"
                name="titleIntroProvider"
                onChange={() => setTitleIntroProvider("mock")}
                type="radio"
              />
              <span>
                <span className="block font-medium text-stone-950">Mock 规则引擎</span>
                <span className="mt-1 block text-stone-500">本地规则生成，不消耗 API 费用，适合快速测试。</span>
              </span>
            </label>
            <label className="flex cursor-pointer gap-2 rounded-md border border-stone-200 bg-white p-3 text-sm text-stone-700 hover:border-red-200">
              <input
                checked={titleIntroProvider === "openai"}
                className="mt-1"
                name="titleIntroProvider"
                onChange={() => setTitleIntroProvider("openai")}
                type="radio"
              />
              <span>
                <span className="block font-medium text-stone-950">OpenAI 文本生成</span>
                <span className="mt-1 block text-stone-500">调用 OpenAI 或中转站生成，更自然，会产生 API 调用费用。</span>
              </span>
            </label>
          </div>
        </div>

        <label className="mt-3 flex items-start gap-2 text-sm text-stone-600">
          <input
            checked={costRiskAccepted}
            className="mt-1"
            onChange={(event) => setCostRiskAccepted(event.target.checked)}
            type="checkbox"
          />
          <span>我确认本次批量任务可能调用外部 API 并产生费用。</span>
        </label>

        <div className="mt-4 flex flex-wrap gap-2">
          {(["identify", "rating", "title_intro", "cover_evaluation"] as const).map((step) => (
            <button
              className="rounded-md bg-stone-900 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-45"
              disabled={selectedIds.length === 0 || batchLoading !== null}
              key={step}
              onClick={() => void createBatchJob(step)}
              type="button"
            >
              {batchLoading === step ? "执行中..." : batchStepLabel(step)}
            </button>
          ))}
        </div>

        {batchError ? <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{batchError}</p> : null}
        {batchMessage ? (
          <p className="mt-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
            {batchMessage} <Link className="underline" href="/analysis">查看结果</Link>
          </p>
        ) : null}
      </section>

      {works.length ? (
        <label className="inline-flex items-center gap-2 text-sm text-stone-600">
          <input checked={allVisibleSelected} onChange={(event) => toggleAllVisible(event.target.checked)} type="checkbox" />
          勾选当前页作品
        </label>
      ) : null}

      <section className="grid gap-4">
        {works.length === 0 ? (
          <div className="rounded-lg border border-stone-200 bg-white p-5 text-sm text-stone-600">
            暂无作品，请先导入 Excel/CSV。
          </div>
        ) : null}
        {works.map((work) => (
          <article className="rounded-lg border border-stone-200 bg-white p-5 transition hover:border-red-200" key={work.id}>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="flex gap-3">
                <input
                  aria-label={`选择 ${work.title}`}
                  checked={selectedIds.includes(work.id)}
                  className="mt-1"
                  onChange={(event) => toggleWork(work.id, event.target.checked)}
                  type="checkbox"
                />
                <div>
                  <Link className="text-lg font-semibold text-stone-950 hover:text-red-800" href={`/works/${work.id}`}>
                    {work.title}
                  </Link>
                  <p className="mt-1 text-sm text-stone-500">
                    作者：{work.author || "-"} | 品类：{work.category || "-"} | 作品ID：{work.externalId || "-"}
                  </p>
                  <p className="mt-3 max-w-3xl line-clamp-2 text-sm text-stone-600" title={work.description}>
                    {work.description}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge>{work.status}</StatusBadge>
                <StatusBadge tone={reviewStatusTone(work.reviewStatus)}>{reviewStatusLabel(work.reviewStatus)}</StatusBadge>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function batchStepLabel(step: "identify" | "rating" | "title_intro" | "cover_evaluation") {
  const labels = {
    cover_evaluation: "批量封面评估",
    identify: "批量识别",
    rating: "批量评级",
    title_intro: "批量生成书名简介",
  };

  return labels[step];
}
