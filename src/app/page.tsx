import Link from "next/link";
import { StatusBadge, coverStrategyLabel, reviewStatusLabel } from "@/components/status-badge";
import { prisma } from "@/server/db";

const ratingOrder = ["S", "A", "B", "C", "D"];
const strategyOrder = ["keep_and_replace_title", "keep_and_optimize_layout", "redraw_cover"];
const reviewOrder = ["pending_review", "approved", "needs_revision", "on_hold", "rejected"];

export default async function DashboardPage() {
  const [
    totalWorks,
    identifiedWorks,
    ratedWorks,
    generatedWorks,
    reviewedWorks,
    pendingReview,
    experimentResultWorks,
    experimentReviewWorks,
    adoptExperimentReviews,
    continueExperimentReviews,
    rollbackExperimentReviews,
    insufficientExperimentReviews,
    feedbackInsightWorks,
    accurateFeedbackInsights,
    inconclusiveFeedbackInsights,
    ratingGroups,
    strategyGroups,
    reviewGroups,
  ] = await Promise.all([
    prisma.work.count(),
    prisma.work.count({ where: { identifications: { some: {} } } }),
    prisma.work.count({ where: { ratings: { some: {} } } }),
    prisma.work.count({ where: { titleIntroGenerations: { some: {} } } }),
    prisma.work.count({ where: { reviewStatus: { not: "pending_review" } } }),
    prisma.work.count({ where: { reviewStatus: "pending_review" } }),
    prisma.work.count({ where: { experimentResults: { some: {} } } }),
    prisma.work.count({ where: { experimentReviews: { some: {} } } }),
    prisma.workExperimentReview.count({ where: { recommendation: "adopt" } }),
    prisma.workExperimentReview.count({ where: { recommendation: "continue_test" } }),
    prisma.workExperimentReview.count({ where: { recommendation: "rollback" } }),
    prisma.workExperimentReview.count({ where: { recommendation: "need_more_data" } }),
    prisma.work.count({ where: { feedbackInsights: { some: {} } } }),
    prisma.workFeedbackInsight.count({ where: { ratingAccuracy: "accurate" } }),
    prisma.workFeedbackInsight.count({ where: { actualOutcome: "inconclusive" } }),
    prisma.workRating.groupBy({ by: ["rating"], _count: { rating: true } }),
    prisma.workCoverEvaluation.groupBy({ by: ["strategy"], _count: { strategy: true } }),
    prisma.work.groupBy({ by: ["reviewStatus"], _count: { reviewStatus: true } }),
  ]);
  const ratingCounts = Object.fromEntries(ratingGroups.map((item) => [item.rating, item._count.rating]));
  const strategyCounts = Object.fromEntries(strategyGroups.map((item) => [item.strategy, item._count.strategy]));
  const reviewCounts = Object.fromEntries(reviewGroups.map((item) => [item.reviewStatus, item._count.reviewStatus]));

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-stone-200 bg-white p-6">
        <StatusBadge tone="red">MVP 本地优先</StatusBadge>
        <h1 className="mt-3 text-3xl font-semibold text-stone-950">内容运营综合管理平台</h1>
        <p className="mt-2 max-w-3xl text-stone-600">
          番茄畅听多书名运营辅助工具。当前已覆盖导入、识别、评级、书名简介生成、封面处理、人工审核、批量任务、测试结果回流和 Excel 导出闭环。
        </p>
      </section>

      <MetricGroup title="处理进度">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="已导入作品数" value={totalWorks} />
        <MetricCard label="已识别作品数" value={identifiedWorks} />
        <MetricCard label="已评级作品数" value={ratedWorks} />
        <MetricCard label="已生成书名简介数" value={generatedWorks} />
        <MetricCard label="已审核作品数" value={reviewedWorks} />
        <MetricCard label="待审核作品数" value={pendingReview} tone="amber" />
      </section>
      </MetricGroup>

      <MetricGroup title="测试复盘">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="已导入测试结果作品数" value={experimentResultWorks} />
        <MetricCard label="已产生复盘结论作品数" value={experimentReviewWorks} />
        <MetricCard label="建议采用数量" value={adoptExperimentReviews} />
        <MetricCard label="建议继续测试数量" value={continueExperimentReviews} />
        <MetricCard label="建议回退数量" value={rollbackExperimentReviews} />
        <MetricCard label="数据不足数量" value={insufficientExperimentReviews} />
      </section>
      </MetricGroup>

      <MetricGroup title="效果洞察">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="已生成效果洞察作品数" value={feedbackInsightWorks} />
        <MetricCard label="评级基本准确洞察数" value={accurateFeedbackInsights} />
        <MetricCard label="效果洞察数据不足数" value={inconclusiveFeedbackInsights} />
      </section>
      </MetricGroup>

      <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        <p className="font-medium">推荐下一步</p>
        <p>{pendingReview > 0 ? `当前有 ${pendingReview} 部作品待审核，建议进入作品列表完成最终审核。` : "当前没有待审核作品。"} {experimentResultWorks > feedbackInsightWorks ? `另有 ${experimentResultWorks - feedbackInsightWorks} 部已导入测试结果的作品尚未生成效果洞察。` : ""}</p>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <DistributionCard
          items={ratingOrder.map((rating) => ({ label: `${rating}级`, tone: distributionTone(rating), value: ratingCounts[rating] ?? 0 }))}
          title="评级分布"
        />
        <DistributionCard
          items={strategyOrder.map((strategy) => ({
            label: coverStrategyLabel(strategy),
            tone: distributionTone(strategy),
            value: strategyCounts[strategy] ?? 0,
          }))}
          title="封面策略分布"
        />
        <DistributionCard
          items={reviewOrder.map((status) => ({
            label: reviewStatusLabel(status),
            tone: distributionTone(status),
            value: reviewCounts[status] ?? 0,
          }))}
          title="审核状态分布"
        />
      </section>

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <QuickAction description="不依赖 Excel，直接录入单本作品。" href="/works/new" title="手动新增作品" />
        <QuickAction description="上传 Excel / CSV，预览校验后写入作品库。" href="/import" title="导入作品" />
        <QuickAction description="检索、筛选并进入单本作品运营流程。" href="/works" title="查看作品" />
        <QuickAction description="查看批量任务进度和失败项重试。" href="/analysis" title="批量任务中心" />
        <QuickAction description="导入多书名测试结果，生成运营复盘。" href="/experiments/import" title="导入测试结果" />
        <QuickAction description="进入作品列表筛选作品，并导出结果或继续审核。" href="/works" title="导出 / 复盘" />
      </section>
    </div>
  );
}

function MetricGroup({ children, title }: { children: React.ReactNode; title: string }) {
  return <section className="space-y-3"><h2 className="text-sm font-semibold text-stone-700">{title}</h2>{children}</section>;
}

function MetricCard({ label, tone = "stone", value }: { label: string; tone?: "stone" | "amber"; value: number }) {
  return (
    <div className={`rounded-lg border p-5 ${tone === "amber" ? "border-amber-300 bg-amber-50 shadow-sm" : "border-stone-200 bg-white"}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-stone-500">{label}</p>
        {tone === "amber" ? <StatusBadge tone="amber">重点</StatusBadge> : null}
      </div>
      <p className="mt-3 text-4xl font-semibold tracking-normal text-stone-950">{value}</p>
    </div>
  );
}

function DistributionCard({ items, title }: { items: Array<{ label: string; tone: DistributionTone; value: number }>; title: string }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5">
      <h2 className="font-semibold text-stone-950">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div className="grid grid-cols-[88px_minmax(80px,1fr)_36px] items-center gap-3 text-sm" key={item.label}>
            <span className={`inline-flex h-7 items-center rounded-md px-2.5 text-xs font-medium ${item.tone.badge}`}>{item.label}</span>
            <div className="h-2.5 overflow-hidden rounded-full bg-stone-100">
              <div className={`h-full rounded-full ${item.tone.bar}`} style={{ width: total > 0 ? `${Math.round((item.value / total) * 100)}%` : "0%" }} />
            </div>
            <span className="text-right font-semibold tabular-nums text-stone-950">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

type DistributionTone = { badge: string; bar: string };

function distributionTone(value: string): DistributionTone {
  const tones: Record<string, DistributionTone> = {
    A: { badge: "bg-blue-100 text-blue-800", bar: "bg-blue-500" },
    B: { badge: "bg-emerald-100 text-emerald-800", bar: "bg-emerald-500" },
    C: { badge: "bg-orange-100 text-orange-800", bar: "bg-orange-500" },
    D: { badge: "bg-red-100 text-red-800", bar: "bg-red-500" },
    S: { badge: "bg-purple-100 text-purple-800", bar: "bg-purple-500" },
    approved: { badge: "bg-green-100 text-green-800", bar: "bg-green-500" },
    keep_and_optimize_layout: { badge: "bg-cyan-100 text-cyan-800", bar: "bg-cyan-500" },
    keep_and_replace_title: { badge: "bg-blue-100 text-blue-800", bar: "bg-blue-500" },
    needs_revision: { badge: "bg-red-100 text-red-800", bar: "bg-red-500" },
    on_hold: { badge: "bg-stone-100 text-stone-700", bar: "bg-stone-400" },
    pending_review: { badge: "bg-orange-100 text-orange-800", bar: "bg-orange-500" },
    redraw_cover: { badge: "bg-red-100 text-red-800", bar: "bg-red-500" },
    rejected: { badge: "bg-zinc-200 text-zinc-800", bar: "bg-zinc-600" },
  };
  return tones[value] ?? { badge: "bg-stone-100 text-stone-700", bar: "bg-stone-400" };
}

function QuickAction({ description, href, title }: { description: string; href: string; title: string }) {
  return (
    <Link className="group rounded-lg border border-stone-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-red-300 hover:bg-red-50 hover:shadow-sm" href={href}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-stone-950">{title}</h2>
        <span className="rounded-md bg-stone-900 px-2 py-1 text-xs font-medium text-white transition group-hover:bg-red-700">进入</span>
      </div>
      <p className="mt-3 text-sm leading-5 text-stone-600">{description}</p>
    </Link>
  );
}
