import Link from "next/link";
import { notFound } from "next/navigation";
import { WorkCoverPanel } from "@/app/works/[id]/work-cover-panel";
import { WorkExportButton } from "@/app/works/[id]/work-export-button";
import { WorkExperimentPanel, type ExperimentReviewView, type ExperimentResultView } from "@/app/works/[id]/work-experiment-panel";
import { WorkFeedbackInsightPanel } from "@/app/works/[id]/work-feedback-insight-panel";
import { WorkIdentificationPanel, type WorkIdentificationView } from "@/app/works/[id]/work-identification-panel";
import { WorkRatingPanel } from "@/app/works/[id]/work-rating-panel";
import { WorkReviewPanel } from "@/app/works/[id]/work-review-panel";
import { WorkTitleIntroPanel } from "@/app/works/[id]/work-title-intro-panel";
import { StatusBadge, coverStrategyLabel, renameSuggestionLabel, reviewStatusLabel } from "@/components/status-badge";
import type { CandidateWork, FinalMatch, SearchEvidence, SearchResultItem, SourceSummary } from "@/lib/adapters/search-adapter";
import { prisma } from "@/server/db";
import { getExperimentResultsForWork, getLatestExperimentReview } from "@/lib/experiments/experiment-service";
import { getLatestFeedbackInsight } from "@/lib/feedback/feedback-service";
import type { FeedbackInsightView } from "@/lib/feedback/feedback-types";

type WorkDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function WorkDetailPage({ params }: WorkDetailPageProps) {
  const { id } = await params;
  const [work, experimentResults, experimentReview, feedbackInsight] = await Promise.all([
    prisma.work.findUnique({
    where: { id },
    include: {
      identifications: {
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
      ratings: { orderBy: { createdAt: "desc" }, take: 1 },
      coverEvaluations: { orderBy: { createdAt: "desc" }, take: 1 },
      titleIntroGenerations: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    }),
    getExperimentResultsForWork(id),
    getLatestExperimentReview(id),
    getLatestFeedbackInsight(id),
  ]);

  if (!work) {
    notFound();
  }
  const identification = work.identifications[0];
  const rating = work.ratings[0] ?? null;
  const coverEvaluation = work.coverEvaluations[0] ?? null;
  const initialIdentification: WorkIdentificationView | null = identification
    ? {
        identificationId: identification.id,
        candidates: safeJsonParse<CandidateWork[]>(identification.candidatesJson, []),
        finalMatch: safeJsonParse<FinalMatch | null>(identification.finalMatchJson, null),
        confidence: identification.confidence,
        reason: identification.reason,
        risks: safeJsonParse<string[]>(identification.risksJson, []),
        searchProvider: identification.searchProvider,
        searchQuery: identification.searchQuery,
        searchResults: safeJsonParse<SearchResultItem[]>(identification.searchResultsJson, []),
        evidence: safeJsonParse<SearchEvidence[]>(identification.evidenceJson, []),
        riskHints: safeJsonParse<string[]>(identification.riskHintsJson, []),
        sourceSummary: safeJsonParse<SourceSummary | null>(identification.sourceSummaryJson, null),
        confirmed: identification.confirmed,
        confirmedTitle: identification.confirmedTitle,
        confirmedAuthor: identification.confirmedAuthor,
      }
    : null;

  return (
    <div className="space-y-6">
      <div>
        <Link className="text-sm text-red-700 hover:text-red-900" href="/works">
          返回作品列表
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-stone-950">{work.title}</h1>
        <p className="mt-2 text-stone-600">作者：{work.author || "-"}</p>
      </div>

      <WorkExportButton workId={work.id} />

      <section className="rounded-lg border border-stone-200 bg-white p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-semibold text-stone-950">处理摘要</h2>
            <p className="mt-1 text-sm text-stone-600">快速确认当前进度，并按下方导航进入目标模块。</p>
          </div>
          <StatusBadge tone={work.reviewStatus === "approved" ? "green" : "amber"}>{nextStepLabel({ coverEvaluation: Boolean(coverEvaluation), experimentReview: Boolean(experimentReview), feedbackInsight: Boolean(feedbackInsight), identification: Boolean(identification), rating: Boolean(rating), reviewStatus: work.reviewStatus })}</StatusBadge>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <SummaryItem label="识别状态" value={identification ? identification.confirmed ? "身份已确认" : "已识别，待确认" : "未识别"} />
          <SummaryItem label="评级" value={rating ? `${rating.rating} 级 / ${rating.score} 分` : "未评级"} />
          <SummaryItem label="多书名建议" value={renameSuggestionLabel(rating?.renameSuggestion)} />
          <SummaryItem label="封面策略" value={coverStrategyLabel(coverEvaluation?.confirmedStrategy || coverEvaluation?.strategy)} />
          <SummaryItem label="测试复盘" value={experimentReview ? "已生成复盘" : "未生成复盘"} />
          <SummaryItem label="效果洞察" value={feedbackInsight ? "已生成洞察" : "未生成洞察"} />
          <SummaryItem label="最终审核" value={reviewStatusLabel(work.reviewStatus)} />
        </div>
      </section>

      <nav className="sticky top-0 z-10 flex gap-2 overflow-x-auto rounded-lg border border-stone-200 bg-white/95 p-3 text-sm shadow-sm backdrop-blur">
        {[
          ["basic-info", "基础信息"], ["identification", "作品识别"], ["rating", "价值评级"], ["title-intro", "书名简介"],
          ["cover", "封面处理"], ["experiment", "测试复盘"], ["feedback-insight", "效果回流"], ["final-review", "最终审核"],
        ].map(([href, label]) => <a className="whitespace-nowrap rounded-md px-3 py-2 text-stone-700 hover:bg-red-50 hover:text-red-800" href={`#${href}`} key={href}>{label}</a>)}
      </nav>

      <section className="rounded-lg border border-stone-200 bg-white p-5" id="basic-info">
        <h2 className="font-semibold text-stone-950">作品简介</h2>
        <p className="mt-3 text-stone-600">{work.description}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-stone-200 bg-white p-5">
          <p className="text-sm text-stone-500">作品ID</p>
          <p className="mt-2 text-lg font-semibold text-stone-950">{work.externalId || "未填写"}</p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-5">
          <p className="text-sm text-stone-500">品类</p>
          <p className="mt-2 text-lg font-semibold text-stone-950">{work.category || "-"}</p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-5">
          <p className="text-sm text-stone-500">封面文件 / 封面地址</p>
          <p className="mt-2 text-lg font-semibold text-stone-950">{work.coverFileName || "-"}</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-stone-200 bg-white p-5">
          <p className="text-sm text-stone-500">当前播放量</p>
          <p className="mt-2 text-lg font-semibold text-stone-950">{work.currentPlays ?? "-"}</p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-5">
          <p className="text-sm text-stone-500">当前点击率</p>
          <p className="mt-2 text-lg font-semibold text-stone-950">
            {work.currentCtr === null ? "-" : `${Math.round(work.currentCtr * 10000) / 100}%`}
          </p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-5">
          <p className="text-sm text-stone-500">当前完播率</p>
          <p className="mt-2 text-lg font-semibold text-stone-950">
            {work.currentFinish === null ? "-" : `${Math.round(work.currentFinish * 10000) / 100}%`}
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="font-semibold text-stone-950">备注</h2>
        <p className="mt-3 text-stone-600">{work.notes || "-"}</p>
      </section>

      <div id="identification"><WorkIdentificationPanel workId={work.id} initialIdentification={initialIdentification} /></div>
      <div id="rating">
      <WorkRatingPanel
        identificationStatus={{
          confirmed: initialIdentification?.confirmed ?? false,
          confidence: initialIdentification?.confidence ?? null,
          hasIdentification: Boolean(initialIdentification),
        }}
        workId={work.id}
      />
      </div>
      <div id="title-intro"><WorkTitleIntroPanel workId={work.id} /></div>
      <div id="cover"><WorkCoverPanel workId={work.id} /></div>
      <div id="experiment">
      <WorkExperimentPanel
        workId={work.id}
        results={experimentResults.map(toExperimentResultView)}
        review={experimentReview ? toExperimentReviewView(experimentReview) : null}
      />
      </div>
      <WorkFeedbackInsightPanel initialInsight={feedbackInsight ? toFeedbackInsightView(feedbackInsight) : null} workId={work.id} />
      <div id="final-review"><WorkReviewPanel workId={work.id} /></div>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-stone-200 bg-stone-50 p-3"><p className="text-xs text-stone-500">{label}</p><p className="mt-1 text-sm font-semibold text-stone-950">{value}</p></div>;
}

function nextStepLabel(status: { identification: boolean; rating: boolean; coverEvaluation: boolean; experimentReview: boolean; feedbackInsight: boolean; reviewStatus: string }) {
  if (!status.identification) return "下一步：运行作品识别";
  if (!status.rating) return "下一步：运行价值评级";
  if (!status.coverEvaluation) return "下一步：评估封面";
  if (status.reviewStatus === "pending_review") return "下一步：完成人工审核";
  if (status.experimentReview && !status.feedbackInsight) return "下一步：生成效果洞察";
  return "当前流程已具备交付条件";
}

function toFeedbackInsightView(insight: {
  id: string; experimentReviewId: string; originalRating: string | null; originalScore: number | null;
  originalRenameSuggestion: string | null; originalCoverStrategy: string | null; finalRecommendation: string | null;
  actualOutcome: string; ratingAccuracy: string; titleStrategyEffect: string; coverStrategyEffect: string;
  keyLiftMetric: string; summary: string; liftSummaryJson: string; evidenceJson: string; riskNotesJson: string;
  strategyTagsJson: string; createdAt: Date;
}): FeedbackInsightView {
  return {
    id: insight.id, experimentReviewId: insight.experimentReviewId, originalRating: insight.originalRating,
    originalScore: insight.originalScore, originalRenameSuggestion: insight.originalRenameSuggestion,
    originalCoverStrategy: insight.originalCoverStrategy, finalRecommendation: insight.finalRecommendation,
    actualOutcome: insight.actualOutcome, ratingAccuracy: insight.ratingAccuracy, titleStrategyEffect: insight.titleStrategyEffect,
    coverStrategyEffect: insight.coverStrategyEffect, keyLiftMetric: insight.keyLiftMetric, summary: insight.summary,
    liftSummary: safeJsonParse(insight.liftSummaryJson, {}), evidence: safeJsonParse(insight.evidenceJson, []),
    riskNotes: safeJsonParse(insight.riskNotesJson, []), strategyTags: safeJsonParse(insight.strategyTagsJson, []),
    createdAt: insight.createdAt.toISOString(),
  };
}

function toExperimentResultView(result: {
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
}): ExperimentResultView {
  return {
    id: result.id,
    experimentName: result.experimentName,
    groupType: result.groupType,
    variantName: result.variantName,
    title: result.title,
    exposureCount: result.exposureCount,
    ctr: result.ctr,
    conversionRate: result.conversionRate,
    finishRate: result.finishRate,
    revenue: result.revenue,
  };
}

function toExperimentReviewView(review: Awaited<ReturnType<typeof getLatestExperimentReview>>): ExperimentReviewView | null {
  if (!review) return null;

  return {
    id: review.id,
    experimentName: review.experimentName,
    conclusion: review.conclusion,
    recommendation: review.recommendation,
    ctrLift: review.ctrLift,
    conversionLift: review.conversionLift,
    finishRateLift: review.finishRateLift,
    revenueLift: review.revenueLift,
    confidenceLevel: review.confidenceLevel,
    riskNotes: safeJsonParse<string[]>(review.riskNotesJson || "[]", []),
    evidence: safeJsonParse<string[]>(review.evidenceJson || "[]", []),
    controlResult: toExperimentResultView(review.controlResult),
    winnerResult: review.winnerResult ? toExperimentResultView(review.winnerResult) : null,
  };
}

function safeJsonParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
