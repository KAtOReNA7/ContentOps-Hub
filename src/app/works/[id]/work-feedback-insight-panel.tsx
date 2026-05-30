"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import type { FeedbackInsightView } from "@/lib/feedback/feedback-types";

type Props = { initialInsight: FeedbackInsightView | null; workId: string };

export function WorkFeedbackInsightPanel({ initialInsight, workId }: Props) {
  const [insight, setInsight] = useState(initialInsight);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function generateInsight() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`/api/works/${workId}/feedback-insight`, { method: "POST" });
      const payload = (await response.json()) as { success: boolean; data?: FeedbackInsightView; message?: string; errors?: string[] };
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error([payload.message || `HTTP ${response.status}`, ...(payload.errors || [])].join(" | "));
      }
      setInsight(toView(payload.data));
      setMessage("效果回流洞察已生成。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "生成效果回流洞察失败。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-4 rounded-lg border border-stone-200 bg-white p-5" id="feedback-insight">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="font-semibold text-stone-950">效果回流 / 评分校准</h2>
          <p className="mt-1 text-sm text-stone-600">基于真实测试复盘判断评级、书名策略和封面策略是否得到验证。</p>
        </div>
        <button className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50" disabled={loading} onClick={generateInsight} type="button">
          {loading ? "生成中..." : insight ? "刷新效果洞察" : "生成效果洞察"}
        </button>
      </div>

      {!insight ? <p className="rounded-md bg-stone-50 p-4 text-sm text-stone-600">暂无效果洞察。请先导入完整对照组和实验组数据并生成复盘。</p> : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone={outcomeTone(insight.actualOutcome)}>实际结果：{outcomeLabel(insight.actualOutcome)}</StatusBadge>
            <StatusBadge tone={accuracyTone(insight.ratingAccuracy)}>评级校准：{accuracyLabel(insight.ratingAccuracy)}</StatusBadge>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Metric label="原系统评级" value={insight.originalRating || "未评级"} />
            <Metric label="原多书名建议" value={renameLabel(insight.originalRenameSuggestion)} />
            <Metric label="原封面策略" value={coverLabel(insight.originalCoverStrategy)} />
            <Metric label="测试推荐动作" value={recommendationLabel(insight.finalRecommendation)} />
            <Metric label="书名策略效果" value={effectLabel(insight.titleStrategyEffect)} />
            <Metric label="封面策略效果" value={effectLabel(insight.coverStrategyEffect)} />
            <Metric label="关键提升指标" value={metricLabel(insight.keyLiftMetric)} />
          </div>
          <p className="rounded-md border border-stone-200 p-4 text-sm leading-6 text-stone-700">{insight.summary}</p>
          <div className="grid gap-3 md:grid-cols-3">
            <ListBlock items={insight.strategyTags} title="策略标签" />
            <ListBlock items={insight.evidence} title="证据说明" />
            <ListBlock items={insight.riskNotes} title="风险提示" />
          </div>
        </div>
      )}
      {message ? <p className="rounded-md bg-stone-100 px-3 py-2 text-sm text-stone-700">{message}</p> : null}
    </section>
  );
}

function toView(value: FeedbackInsightView): FeedbackInsightView {
  return { ...value, liftSummary: safeJson(value.liftSummary), evidence: safeJson(value.evidence), riskNotes: safeJson(value.riskNotes), strategyTags: safeJson(value.strategyTags) };
}
function safeJson<T>(value: T | string): T { if (typeof value !== "string") return value; try { return JSON.parse(value) as T; } catch { return [] as T; } }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-md border border-stone-200 bg-stone-50 p-3"><p className="text-xs text-stone-500">{label}</p><p className="mt-1 text-sm font-semibold text-stone-950">{value}</p></div>; }
function ListBlock({ items, title }: { items: string[]; title: string }) { return <div className="rounded-md border border-stone-200 p-4"><p className="text-sm font-medium text-stone-950">{title}</p><ul className="mt-2 space-y-1 text-sm text-stone-600">{(items.length ? items : ["暂无"]).map((item) => <li key={item}>• {item}</li>)}</ul></div>; }
function outcomeLabel(v: string) { return ({ positive: "正向", neutral: "中性", negative: "负向", inconclusive: "数据不足" } as Record<string,string>)[v] || v; }
function accuracyLabel(v: string) { return ({ overestimated: "评分偏高", underestimated: "评分偏低", accurate: "基本准确", unknown: "暂无法判断" } as Record<string,string>)[v] || v; }
function effectLabel(v: string) { return ({ effective: "有效", ineffective: "无效", mixed: "效果混合", unknown: "暂无法判断" } as Record<string,string>)[v] || v; }
function metricLabel(v: string) { return ({ ctr: "点击率", conversion: "转化率", finish_rate: "完播率", revenue: "收入", mixed: "多项指标", none: "暂无" } as Record<string,string>)[v] || v; }
function recommendationLabel(v: string | null) { return ({ adopt: "建议采用", continue_test: "继续测试", rollback: "建议回退", need_more_data: "数据不足" } as Record<string,string>)[v || ""] || "暂无"; }
function renameLabel(v: string | null) { return ({ avoid: "不建议改名", cautious: "谨慎测试", recommended: "建议测试", strongly_recommended: "强烈建议测试" } as Record<string,string>)[v || ""] || "暂无"; }
function coverLabel(v: string | null) { return ({ keep_and_replace_title: "保留主体，仅替换标题", keep_and_optimize_layout: "保留主体，优化版式", redraw_cover: "重新绘制封面" } as Record<string,string>)[v || ""] || "暂无"; }
function outcomeTone(v: string): "green"|"amber"|"red"|"stone" { return v === "positive" ? "green" : v === "negative" ? "red" : v === "neutral" ? "amber" : "stone"; }
function accuracyTone(v: string): "green"|"amber"|"red"|"stone" { return v === "accurate" ? "green" : v === "unknown" ? "stone" : v === "underestimated" ? "amber" : "red"; }
