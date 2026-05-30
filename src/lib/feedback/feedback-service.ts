import type { WorkExperimentReview, WorkExperimentResult } from "@prisma/client";
import type { ActualOutcome, KeyLiftMetric, RatingAccuracy, StrategyEffect } from "@/lib/feedback/feedback-types";
import { prisma } from "@/server/db";

export async function generateFeedbackInsight(workId: string) {
  const review = await prisma.workExperimentReview.findFirst({
    where: { workId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (!review) throw new Error("暂无可用实验复盘。请先导入包含对照组和实验组的测试结果。");
  return generateFeedbackInsightForReview(review.id);
}

export async function generateFeedbackInsightForReview(reviewId: string) {
  const review = await prisma.workExperimentReview.findUnique({
    where: { id: reviewId },
    include: {
      controlResult: true,
      winnerResult: true,
      work: {
        include: {
          ratings: { orderBy: { createdAt: "desc" }, take: 1 },
          coverEvaluations: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
  });
  if (!review || !review.winnerResult) throw new Error("复盘结果不完整，暂时无法生成效果洞察。");

  const rating = review.work.ratings[0] ?? null;
  const coverEvaluation = review.work.coverEvaluations[0] ?? null;
  const actualOutcome = evaluateActualOutcome(review);
  const ratingAccuracy = evaluateRatingAccuracy(rating?.rating ?? null, review, actualOutcome);
  const titleStrategyEffect = evaluateTitleStrategyEffect(review.controlResult, review.winnerResult);
  const coverStrategyEffect = evaluateCoverStrategyEffect(review.controlResult, review.winnerResult);
  const keyLiftMetric = evaluateKeyLiftMetric(review);
  const riskNotes = buildRiskNotes(review, titleStrategyEffect, coverStrategyEffect);
  const strategyTags = summarizeStrategyTags({
    actualOutcome,
    category: review.work.category,
    coverStrategy: coverEvaluation?.confirmedStrategy || coverEvaluation?.strategy || null,
    coverStrategyEffect,
    review,
    titleStrategyEffect,
  });
  const evidence = buildEvidence(review, rating?.rating ?? null, coverEvaluation?.strategy ?? null);
  const summary = buildSummary(actualOutcome, ratingAccuracy, titleStrategyEffect, coverStrategyEffect, keyLiftMetric);
  const liftSummary = {
    ctrLift: review.ctrLift,
    conversionLift: review.conversionLift,
    finishRateLift: review.finishRateLift,
    revenueLift: review.revenueLift,
  };

  return prisma.workFeedbackInsight.create({
    data: {
      workId: review.workId,
      experimentReviewId: review.id,
      originalRating: rating?.rating ?? null,
      originalScore: rating?.score ?? null,
      originalRenameSuggestion: rating?.renameSuggestion ?? null,
      originalCoverStrategy: coverEvaluation?.confirmedStrategy || coverEvaluation?.strategy || null,
      finalRecommendation: review.recommendation,
      actualOutcome,
      ratingAccuracy,
      titleStrategyEffect,
      coverStrategyEffect,
      keyLiftMetric,
      summary,
      liftSummaryJson: JSON.stringify(liftSummary),
      evidenceJson: JSON.stringify(evidence),
      riskNotesJson: JSON.stringify(riskNotes),
      strategyTagsJson: JSON.stringify(strategyTags),
    },
  });
}

export async function getLatestFeedbackInsight(workId: string) {
  return prisma.workFeedbackInsight.findFirst({
    where: { workId },
    orderBy: { createdAt: "desc" },
  });
}

function evaluateActualOutcome(review: WorkExperimentReview): ActualOutcome {
  if (review.recommendation === "need_more_data") return "inconclusive";
  if (review.recommendation === "continue_test") return "neutral";
  if (review.recommendation === "rollback") return "negative";
  const lifts = [review.ctrLift, review.conversionLift, review.revenueLift].filter((value): value is number => typeof value === "number");
  return lifts.some((value) => value > 0) ? "positive" : "inconclusive";
}

function evaluateRatingAccuracy(rating: string | null, review: WorkExperimentReview, outcome: ActualOutcome): RatingAccuracy {
  if (!rating || outcome === "inconclusive") return "unknown";
  if ((rating === "S" || rating === "A") && review.recommendation === "rollback") return "overestimated";
  if ((rating === "C" || rating === "D") && outcome === "positive") return "underestimated";
  if ((rating === "S" || rating === "A") && review.recommendation !== "adopt") return "unknown";
  return "accurate";
}

function evaluateTitleStrategyEffect(control: WorkExperimentResult, winner: WorkExperimentResult): StrategyEffect {
  if (!winner.title || winner.title === control.title) return "unknown";
  return effectFromLifts(winner.ctr, control.ctr, winner.conversionRate, control.conversionRate);
}

function evaluateCoverStrategyEffect(control: WorkExperimentResult, winner: WorkExperimentResult): StrategyEffect {
  if (!winner.coverUrl || winner.coverUrl === control.coverUrl) return "unknown";
  return effectFromLifts(winner.ctr, control.ctr, winner.conversionRate, control.conversionRate);
}

function effectFromLifts(primary: number | null, basePrimary: number | null, secondary: number | null, baseSecondary: number | null): StrategyEffect {
  if (primary === null || basePrimary === null) return "unknown";
  const primaryLift = primary - basePrimary;
  const secondaryLift = secondary !== null && baseSecondary !== null ? secondary - baseSecondary : null;
  if (primaryLift > 0 && secondaryLift !== null && secondaryLift < 0) return "mixed";
  if (primaryLift > 0) return "effective";
  if (primaryLift < 0) return "ineffective";
  return "unknown";
}

function evaluateKeyLiftMetric(review: WorkExperimentReview): KeyLiftMetric {
  const values = [
    ["ctr", review.ctrLift],
    ["conversion", review.conversionLift],
    ["finish_rate", review.finishRateLift],
    ["revenue", review.revenueLift],
  ] as const;
  const positive = values.filter(([, value]) => typeof value === "number" && value > 0);
  if (!positive.length) return "none";
  if (positive.length > 1) return "mixed";
  return positive[0][0];
}

function buildRiskNotes(review: WorkExperimentReview, titleEffect: StrategyEffect, coverEffect: StrategyEffect) {
  const risks: string[] = [];
  if (review.confidenceLevel === "low") risks.push("曝光或样本不足，当前效果洞察仅供参考。");
  if (titleEffect === "mixed" || coverEffect === "mixed") risks.push("点击提升但转化下降，需要继续观察流量质量。");
  if (typeof review.finishRateLift === "number" && review.finishRateLift < 0) risks.push("点击或转化改善时完播率下降，需要检查内容承接。");
  if (review.conversionLift === null) risks.push("缺少转化率变化，无法完整判断运营效果。");
  return risks;
}

function summarizeStrategyTags({ actualOutcome, category, coverStrategy, coverStrategyEffect, review, titleStrategyEffect }: {
  actualOutcome: ActualOutcome;
  category: string | null;
  coverStrategy: string | null;
  coverStrategyEffect: StrategyEffect;
  review: WorkExperimentReview;
  titleStrategyEffect: StrategyEffect;
}) {
  const tags: string[] = [];
  if (review.confidenceLevel === "low") tags.push("曝光不足");
  if (titleStrategyEffect === "effective") tags.push("书名调整有效");
  if (titleStrategyEffect === "ineffective") tags.push("原书名认知更强");
  if (titleStrategyEffect === "mixed") tags.push("CTR 提升但转化下降");
  if (coverStrategyEffect === "effective" && coverStrategy === "keep_and_replace_title") tags.push("换标题有效");
  if (coverStrategyEffect === "effective" && coverStrategy === "keep_and_optimize_layout") tags.push("优化版式有效");
  if (coverStrategyEffect === "effective" && coverStrategy === "redraw_cover") tags.push("重绘封面有效");
  if (coverStrategyEffect === "ineffective") tags.push("原封面更稳定");
  if (category && actualOutcome === "positive") tags.push(`${category}类运营方向已通过测试验证`);
  return Array.from(new Set(tags));
}

function buildEvidence(review: WorkExperimentReview, rating: string | null, coverStrategy: string | null) {
  return [
    `实验：${review.experimentName}`,
    `复盘建议：${review.recommendation}`,
    `实验前评级：${rating || "未评级"}`,
    `实验前封面策略：${coverStrategy || "未评估"}`,
    `CTR 变化：${formatPercent(review.ctrLift)}`,
    `转化率变化：${formatPercent(review.conversionLift)}`,
    `完播率变化：${formatPercent(review.finishRateLift)}`,
    `收入变化：${review.revenueLift ?? "缺失"}`,
  ];
}

function buildSummary(outcome: ActualOutcome, rating: RatingAccuracy, title: StrategyEffect, cover: StrategyEffect, metric: KeyLiftMetric) {
  return `真实测试结果为${outcomeLabel(outcome)}；评级校准判断为${ratingAccuracyLabel(rating)}；书名策略${effectLabel(title)}；封面策略${effectLabel(cover)}；关键提升指标为${metricLabel(metric)}。`;
}

function formatPercent(value: number | null) {
  return value === null ? "缺失" : `${Math.round(value * 10000) / 100}%`;
}

function outcomeLabel(value: ActualOutcome) {
  return { positive: "正向", neutral: "中性", negative: "负向", inconclusive: "数据不足" }[value];
}

function ratingAccuracyLabel(value: RatingAccuracy) {
  return { overestimated: "评分偏高", underestimated: "评分偏低", accurate: "基本准确", unknown: "暂无法判断" }[value];
}

function effectLabel(value: StrategyEffect) {
  return { effective: "有效", ineffective: "无效", mixed: "效果混合", unknown: "暂无法判断" }[value];
}

function metricLabel(value: KeyLiftMetric) {
  return { ctr: "点击率", conversion: "转化率", finish_rate: "完播率", revenue: "收入", mixed: "多项指标", none: "暂无" }[value];
}
