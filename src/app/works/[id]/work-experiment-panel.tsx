"use client";

import Link from "next/link";
import { useState } from "react";
import { StatusBadge } from "@/components/status-badge";

export type ExperimentResultView = {
  id: string;
  experimentName: string | null;
  groupType: string;
  variantName: string | null;
  title: string;
  exposureCount: number | null;
  ctr: number | null;
  conversionRate: number | null;
  finishRate: number | null;
  revenue: number | null;
};

export type ExperimentReviewView = {
  id: string;
  experimentName: string;
  conclusion: string;
  recommendation: string;
  ctrLift: number | null;
  conversionLift: number | null;
  finishRateLift: number | null;
  revenueLift: number | null;
  confidenceLevel: string;
  riskNotes: string[];
  evidence: string[];
  controlResult: ExperimentResultView;
  winnerResult: ExperimentResultView | null;
};

type WorkExperimentPanelProps = {
  workId: string;
  results: ExperimentResultView[];
  review: ExperimentReviewView | null;
};

export function WorkExperimentPanel({ results, review, workId }: WorkExperimentPanelProps) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function adoptWinner() {
    if (!review?.winnerResult) return;

    const confirmed = window.confirm("确认将实验胜出版本设为最终采用结果？该操作会更新最终书名/简介/封面地址。");
    if (!confirmed) return;

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`/api/works/${workId}/experiment-review/adopt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId: review.id }),
      });
      const payload = (await response.json()) as { success: boolean; message?: string; errors?: string[] };

      if (!response.ok || !payload.success) {
        throw new Error([payload.message || `HTTP ${response.status}`, ...(payload.errors || [])].join(" | "));
      }

      setMessage("已将实验胜出版本设为最终采用结果。刷新页面后可查看最新最终采用信息。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "采用胜出版本失败。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-4 rounded-lg border border-stone-200 bg-white p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="font-semibold text-stone-950">测试结果 / 复盘</h2>
          <p className="mt-1 text-sm text-stone-600">导入多书名实验数据后，系统会生成本地规则复盘结论。</p>
        </div>
        <Link className="rounded-md border border-stone-300 px-3 py-2 text-sm hover:border-red-300 hover:bg-red-50" href="/experiments/import">
          导入测试结果
        </Link>
      </div>

      {!review ? (
        <div className="rounded-md bg-stone-50 p-4 text-sm text-stone-600">暂无复盘结论。请先导入包含对照组和实验组的测试结果。</div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone={recommendationTone(review.recommendation)}>{recommendationLabel(review.recommendation)}</StatusBadge>
            <StatusBadge tone={review.confidenceLevel === "high" ? "green" : review.confidenceLevel === "medium" ? "blue" : "amber"}>
              置信度：{confidenceLabel(review.confidenceLevel)}
            </StatusBadge>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <Metric label="CTR 提升" value={formatPercent(review.ctrLift)} />
            <Metric label="转化率提升" value={formatPercent(review.conversionLift)} />
            <Metric label="完播率变化" value={formatPercent(review.finishRateLift)} />
            <Metric label="收入变化" value={review.revenueLift === null ? "-" : String(review.revenueLift)} />
          </div>

          <div className="rounded-md border border-stone-200 p-4">
            <p className="text-sm font-medium text-stone-950">复盘结论</p>
            <p className="mt-2 text-sm leading-6 text-stone-700">{review.conclusion}</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <ResultCard result={review.controlResult} title="对照组" />
            {review.winnerResult ? <ResultCard result={review.winnerResult} title="胜出版本" /> : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <ListBlock items={review.evidence} title="证据说明" />
            <ListBlock items={review.riskNotes} title="风险提示" />
          </div>

          {review.winnerResult ? (
            <button
              className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              disabled={loading}
              onClick={adoptWinner}
              type="button"
            >
              {loading ? "保存中..." : "将胜出版本设为最终采用结果"}
            </button>
          ) : null}
        </div>
      )}

      {results.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-stone-50 text-stone-500">
              <tr>
                <th className="px-3 py-2">实验</th>
                <th className="px-3 py-2">组别</th>
                <th className="px-3 py-2">书名</th>
                <th className="px-3 py-2">曝光</th>
                <th className="px-3 py-2">CTR</th>
                <th className="px-3 py-2">转化率</th>
                <th className="px-3 py-2">完播率</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => (
                <tr className="border-t border-stone-100" key={result.id}>
                  <td className="px-3 py-2">{result.experimentName || "-"}</td>
                  <td className="px-3 py-2">{result.groupType === "control" ? "对照组" : result.variantName || "实验组"}</td>
                  <td className="px-3 py-2">{result.title}</td>
                  <td className="px-3 py-2">{result.exposureCount ?? "-"}</td>
                  <td className="px-3 py-2">{formatPercent(result.ctr)}</td>
                  <td className="px-3 py-2">{formatPercent(result.conversionRate)}</td>
                  <td className="px-3 py-2">{formatPercent(result.finishRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {message ? <p className="rounded-md bg-stone-100 px-3 py-2 text-sm text-stone-700">{message}</p> : null}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-stone-950">{value}</p>
    </div>
  );
}

function ResultCard({ result, title }: { result: ExperimentResultView; title: string }) {
  return (
    <div className="rounded-md border border-stone-200 p-4">
      <p className="text-sm font-medium text-stone-950">{title}</p>
      <p className="mt-2 text-sm text-stone-700">{result.title}</p>
      <p className="mt-2 text-xs text-stone-500">
        曝光 {result.exposureCount ?? "-"} | CTR {formatPercent(result.ctr)} | 转化 {formatPercent(result.conversionRate)}
      </p>
    </div>
  );
}

function ListBlock({ items, title }: { items: string[]; title: string }) {
  return (
    <div className="rounded-md border border-stone-200 p-4">
      <p className="text-sm font-medium text-stone-950">{title}</p>
      <ul className="mt-2 space-y-1 text-sm text-stone-600">
        {(items.length ? items : ["暂无"]).map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}

function formatPercent(value: number | null) {
  return value === null ? "-" : `${Math.round(value * 10000) / 100}%`;
}

function recommendationLabel(value: string) {
  const labels: Record<string, string> = {
    adopt: "建议采用",
    continue_test: "继续测试",
    need_more_data: "数据不足",
    rollback: "建议回退",
  };
  return labels[value] || value;
}

function recommendationTone(value: string): "stone" | "green" | "amber" | "orange" | "red" | "blue" | "purple" {
  if (value === "adopt") return "green";
  if (value === "continue_test") return "blue";
  if (value === "rollback") return "red";
  return "amber";
}

function confidenceLabel(value: string) {
  if (value === "high") return "高";
  if (value === "medium") return "中";
  return "低";
}
