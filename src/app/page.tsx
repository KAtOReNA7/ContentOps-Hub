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
    ratingGroups,
    strategyGroups,
    reviewGroups,
  ] = await Promise.all([
    prisma.work.count(),
    prisma.work.count({ where: { identifications: { some: {} } } }),
    prisma.work.count({ where: { ratings: { some: {} } } }),
    prisma.work.count({ where: { titleIntroGenerations: { some: {} } } }),
    prisma.work.count({ where: { reviewStatus: { not: "pending_review" } } }),
    prisma.workRating.groupBy({ by: ["rating"], _count: { rating: true } }),
    prisma.workCoverEvaluation.groupBy({ by: ["strategy"], _count: { strategy: true } }),
    prisma.work.groupBy({ by: ["reviewStatus"], _count: { reviewStatus: true } }),
  ]);
  const pendingReview = await prisma.work.count({ where: { reviewStatus: "pending_review" } });
  const ratingCounts = Object.fromEntries(ratingGroups.map((item) => [item.rating, item._count.rating]));
  const strategyCounts = Object.fromEntries(strategyGroups.map((item) => [item.strategy, item._count.strategy]));
  const reviewCounts = Object.fromEntries(reviewGroups.map((item) => [item.reviewStatus, item._count.reviewStatus]));

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-stone-200 bg-white p-6">
        <StatusBadge tone="red">MVP 本地优先</StatusBadge>
        <h1 className="mt-3 text-3xl font-semibold text-stone-950">内容运营综合管理平台</h1>
        <p className="mt-2 max-w-3xl text-stone-600">
          番茄畅畅听多书名运营辅助工具。当前已覆盖导入、识别、评级、书名简介生成、封面处理、人工审核和 Excel 导出闭环。
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="已导入作品数" value={totalWorks} />
        <MetricCard label="已识别作品数" value={identifiedWorks} />
        <MetricCard label="已评级作品数" value={ratedWorks} />
        <MetricCard label="已生成书名简介数" value={generatedWorks} />
        <MetricCard label="已审核作品数" value={reviewedWorks} />
        <MetricCard label="待审核作品数" value={pendingReview} tone="amber" />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <DistributionCard
          items={ratingOrder.map((rating) => ({ label: `${rating}级`, tone: distributionTone(rating, "rating"), value: ratingCounts[rating] ?? 0 }))}
          title="评级分布"
        />
        <DistributionCard
          items={strategyOrder.map((strategy) => ({
            label: coverStrategyLabel(strategy),
            tone: distributionTone(strategy, "strategy"),
            value: strategyCounts[strategy] ?? 0,
          }))}
          title="封面策略分布"
        />
        <DistributionCard
          items={reviewOrder.map((status) => ({
            label: reviewStatusLabel(status),
            tone: distributionTone(status, "review"),
            value: reviewCounts[status] ?? 0,
          }))}
          title="审核状态分布"
        />
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <QuickAction description="上传 Excel / CSV，预览校验后写入作品库。" href="/import" title="导入作品" />
        <QuickAction description="检索、筛选并进入单本作品运营流程。" href="/works" title="查看作品" />
        <QuickAction description="聚焦仍需人工确认的作品，推进交付闭环。" href="/works?reviewStatus=pending_review" title="查看待审核" />
        <QuickAction description="下载当前作品库的运营建议 Excel。" href="/api/export/works" title="导出结果" />
      </section>
    </div>
  );
}

function MetricCard({ label, tone = "stone", value }: { label: string; tone?: "stone" | "amber"; value: number }) {
  return (
    <div
      className={`rounded-lg border p-5 ${
        tone === "amber" ? "border-amber-300 bg-amber-50 shadow-sm" : "border-stone-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-stone-500">{label}</p>
        {tone === "amber" ? <StatusBadge tone="amber">重点</StatusBadge> : null}
      </div>
      <p className="mt-3 text-4xl font-semibold tracking-normal text-stone-950">{value}</p>
    </div>
  );
}

function DistributionCard({
  items,
  title,
}: {
  items: Array<{ label: string; tone: DistributionTone; value: number }>;
  title: string;
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5">
      <h2 className="font-semibold text-stone-950">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div className="grid grid-cols-[88px_minmax(80px,1fr)_36px] items-center gap-3 text-sm" key={item.label}>
            <span className={`inline-flex h-7 items-center rounded-md px-2.5 text-xs font-medium ${item.tone.badge}`}>
              {item.label}
            </span>
            <div className="h-2.5 overflow-hidden rounded-full bg-stone-100">
              <div
                className={`h-full rounded-full ${item.tone.bar}`}
                style={{ width: total > 0 ? `${Math.round((item.value / total) * 100)}%` : "0%" }}
              />
            </div>
            <span className="text-right font-semibold tabular-nums text-stone-950">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

type DistributionTone = {
  badge: string;
  bar: string;
};

function distributionTone(value: string, group: "rating" | "review" | "strategy"): DistributionTone {
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

  return tones[value] ?? (group === "rating" ? tones.D : { badge: "bg-stone-100 text-stone-700", bar: "bg-stone-400" });
}

function QuickAction({ description, href, title }: { description: string; href: string; title: string }) {
  return (
    <Link
      className="group rounded-lg border border-stone-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-red-300 hover:bg-red-50 hover:shadow-sm"
      href={href}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-stone-950">{title}</h2>
        <span className="rounded-md bg-stone-900 px-2 py-1 text-xs font-medium text-white transition group-hover:bg-red-700">
          进入
        </span>
      </div>
      <p className="mt-3 text-sm leading-5 text-stone-600">{description}</p>
    </Link>
  );
}
