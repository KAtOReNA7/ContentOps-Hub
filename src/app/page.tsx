import Link from "next/link";
import { StatusBadge, reviewStatusLabel } from "@/components/status-badge";
import { ActionCard, EmptyState, MetricBar, PageHeader, SectionCard, StatCard } from "@/components/ui";
import { uiTokens } from "@/lib/ui/design-tokens";
import { prisma } from "@/server/db";

const ratingOrder = ["S", "A", "B", "C", "D"];
const strategyOrder = ["keep_and_replace_title", "keep_and_optimize_layout", "redraw_cover"];
const reviewOrder = ["pending_review", "approved", "needs_revision", "on_hold", "rejected"];

export default async function DashboardPage() {
  const [totalWorks, identifiedWorks, ratedWorks, generatedWorks, reviewedWorks, pendingReview, experimentResultWorks, experimentReviewWorks, adoptExperimentReviews, continueExperimentReviews, rollbackExperimentReviews, insufficientExperimentReviews, feedbackInsightWorks, accurateFeedbackInsights, inconclusiveFeedbackInsights, ratingGroups, strategyGroups, reviewGroups] = await Promise.all([
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
  const nextAction = dashboardNextAction({ feedbackInsightWorks, experimentResultWorks, experimentReviewWorks, pendingReview, totalWorks });

  return (
    <div className="space-y-6">
      <SectionCard className="overflow-hidden bg-[linear-gradient(135deg,#ffffff_0%,#f4f8ff_100%)]">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
          <div>
            <div className="mb-3 flex flex-wrap gap-2"><StatusBadge tone="blue">v0.21 运营工作台</StatusBadge><StatusBadge tone="green">本地优先</StatusBadge><StatusBadge>成本受控</StatusBadge></div>
            <PageHeader eyebrow="ContentOps Hub" title="内容运营综合管理平台" description="从导入、识别、评级、审核到复盘与效果洞察的全流程管理。聚合运营决策所需信息，把下一步动作放在最容易触达的位置。" />
            <div className="mt-5 flex flex-wrap gap-2"><Link className={uiTokens.primaryButton} href={nextAction.href}>{nextAction.action}</Link><Link className={uiTokens.secondaryButton} href="/import">导入作品</Link></div>
          </div>
          <div className="rounded-xl border border-blue-100 bg-white/80 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Workflow overview</p>
            <div className="mt-4 space-y-3">{[["导入", totalWorks], ["识别", identifiedWorks], ["评级", ratedWorks], ["审核", reviewedWorks]].map(([label, value], index) => <div className="flex items-center gap-3" key={String(label)}><span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">{index + 1}</span><span className="flex-1 text-sm text-slate-600">{label}</span><strong className="tabular-nums text-slate-950">{value}</strong></div>)}</div>
          </div>
        </div>
      </SectionCard>

      {totalWorks === 0 ? <EmptyState title="暂无作品" description="先导入作品清单或手动新增作品，再开始识别、评级和多书名运营流程。" href="/import" action="导入作品" secondaryHref="/works/new" secondaryAction="手动新增作品" /> : null}

      <section className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <SectionCard className="border-blue-200 bg-blue-50/50" title="今日重点 / 推荐下一步" status={<StatusBadge tone={nextAction.tone}>{nextAction.badge}</StatusBadge>}>
          <p className="text-sm leading-6 text-slate-700">{nextAction.description}</p>
          <Link className="mt-4 inline-flex text-sm font-semibold text-blue-700 hover:text-blue-900" href={nextAction.href}>{nextAction.action} →</Link>
        </SectionCard>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <StatCard label="已导入作品" value={totalWorks} />
          <StatCard label="已识别" value={identifiedWorks} />
          <StatCard label="已评级" value={ratedWorks} />
          <StatCard label="已生成建议" value={generatedWorks} />
          <StatCard label="已审核" value={reviewedWorks} />
          <StatCard highlight label="待审核" value={pendingReview} hint="优先处理" />
        </div>
      </section>

      <MetricGroup title="测试复盘">
        <StatCard label="已导入测试结果" value={experimentResultWorks} />
        <StatCard label="已生成复盘结论" value={experimentReviewWorks} />
        <StatCard label="建议采用" value={adoptExperimentReviews} />
        <StatCard label="建议继续测试" value={continueExperimentReviews} />
        <StatCard label="建议回退" value={rollbackExperimentReviews} />
        <StatCard label="数据不足" value={insufficientExperimentReviews} />
      </MetricGroup>

      <MetricGroup title="效果洞察">
        <StatCard label="已生成效果洞察" value={feedbackInsightWorks} />
        <StatCard label="评级基本准确" value={accurateFeedbackInsights} />
        <StatCard label="洞察数据不足" value={inconclusiveFeedbackInsights} />
      </MetricGroup>

      <section className="grid gap-4 lg:grid-cols-3">
        <DistributionCard items={ratingOrder.map((rating) => ({ label: `${rating}级`, tone: metricTone(rating), value: ratingCounts[rating] ?? 0 }))} title="评级分布" />
        <DistributionCard items={strategyOrder.map((strategy) => ({ label: dashboardCoverStrategyLabel(strategy), tone: metricTone(strategy), value: strategyCounts[strategy] ?? 0 }))} title="封面策略分布" />
        <DistributionCard items={reviewOrder.map((status) => ({ label: reviewStatusLabel(status), tone: metricTone(status), value: reviewCounts[status] ?? 0 }))} title="审核状态分布" />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">快捷入口</h2>
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <ActionCard description="不依赖 Excel，直接录入单本作品。" href="/works/new" icon="+" title="手动新增作品" />
          <ActionCard description="上传 Excel / CSV，校验后写入作品库。" href="/import" icon="⇩" title="导入作品" />
          <ActionCard description="检索、筛选并进入单本运营流程。" href="/works" icon="▤" title="查看作品" />
          <ActionCard description="查看批量任务进度和失败项重试。" href="/analysis" icon="◫" title="批量任务中心" />
          <ActionCard description="导入测试结果并生成运营复盘。" href="/experiments/import" icon="⌁" title="导入测试结果" />
          <ActionCard description="按筛选结果导出或继续审核。" href="/works" icon="↗" title="导出 / 复盘" />
        </div>
      </section>
    </div>
  );
}

function MetricGroup({ children, title }: { children: React.ReactNode; title: string }) {
  return <section><h2 className="mb-3 text-sm font-semibold text-slate-700">{title}</h2><div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">{children}</div></section>;
}

function DistributionCard({ items, title }: { items: Array<{ label: string; tone: Parameters<typeof MetricBar>[0]["tone"]; value: number }>; title: string }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  return <SectionCard title={title}>{<div className="space-y-3">{items.map((item) => <MetricBar key={item.label} label={item.label} tone={item.tone} total={total} value={item.value} />)}</div>}</SectionCard>;
}

function dashboardCoverStrategyLabel(strategy: string) {
  if (strategy === "keep_and_replace_title") return "换标题";
  if (strategy === "keep_and_optimize_layout") return "优化版式";
  return "重绘";
}

function metricTone(value: string): Parameters<typeof MetricBar>[0]["tone"] {
  if (["S"].includes(value)) return "purple";
  if (["A", "approved", "keep_and_replace_title"].includes(value)) return "green";
  if (["B", "keep_and_optimize_layout"].includes(value)) return "blue";
  if (["C", "pending_review", "on_hold"].includes(value)) return "amber";
  if (["D", "needs_revision", "rejected", "redraw_cover"].includes(value)) return "red";
  return "slate";
}

function dashboardNextAction(status: { feedbackInsightWorks: number; experimentResultWorks: number; experimentReviewWorks: number; pendingReview: number; totalWorks: number }) {
  if (status.totalWorks === 0) return { action: "导入作品", badge: "开始使用", description: "当前还没有作品。先导入作品清单或手动录入单本作品，再进入后续运营流程。", href: "/import", tone: "blue" as const };
  if (status.pendingReview > 0) return { action: "查看待审核作品", badge: `${status.pendingReview} 部待审核`, description: `当前有 ${status.pendingReview} 部作品等待人工审核。优先确认最终书名、简介和封面，完成交付闭环。`, href: "/works?reviewStatus=pending_review", tone: "amber" as const };
  if (status.experimentResultWorks > status.experimentReviewWorks) return { action: "进入测试复盘", badge: "需要复盘", description: "存在已导入测试结果但尚未生成复盘的作品。建议进入作品详情完成复盘。", href: "/works", tone: "blue" as const };
  if (status.experimentReviewWorks > status.feedbackInsightWorks) return { action: "生成效果洞察", badge: "需要洞察", description: "存在已生成复盘但尚未沉淀效果洞察的作品。建议进入作品详情完成评分校准。", href: "/works", tone: "blue" as const };
  return { action: "查看作品列表", badge: "流程正常", description: "当前没有高优先级阻塞项。可以继续查看作品、导入测试结果或导出交付材料。", href: "/works", tone: "green" as const };
}
