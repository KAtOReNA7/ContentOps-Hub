import type { WorkExperimentResult } from "@prisma/client";
import { validateExperimentRows } from "@/lib/experiments/experiment-import";
import type { ExperimentConfidenceLevel, ExperimentImportRow, ExperimentRecommendation, NormalizedExperimentRow } from "@/lib/experiments/experiment-types";
import { prisma } from "@/server/db";

type ImportExperimentResultsInput = {
  rows: ExperimentImportRow[];
};

export type ExperimentImportResult = {
  success: boolean;
  imported: number;
  failed: number;
  skippedEmpty: number;
  matchedWorks: number;
  unmatchedWorks: number;
  reviewsCreated: number;
  unableToReview: number;
  errors: Array<{ rowNumber: number; reason: string }>;
};

export async function importExperimentResults({ rows }: ImportExperimentResultsInput): Promise<ExperimentImportResult> {
  const errors: Array<{ rowNumber: number; reason: string }> = [];
  let imported = 0;
  let skippedEmpty = 0;
  let unmatchedWorks = 0;
  const matchedWorkIds = new Set<string>();
  const touched = new Set<string>();
  const previewRows = validateExperimentRows(rows);

  for (const normalized of previewRows) {
    const { rowNumber } = normalized;

    try {
      if (normalized.empty) {
        skippedEmpty += 1;
        continue;
      }
      if (!normalized.importable) {
        errors.push({ rowNumber, reason: normalized.errors.join("；") });
        continue;
      }
      const work = await findWorkForExperiment(normalized);

      if (!work) {
        unmatchedWorks += 1;
        errors.push({ rowNumber, reason: "未匹配到作品，请检查作品 ID 或书名/作者。" });
        continue;
      }
      matchedWorkIds.add(work.id);

      await prisma.workExperimentResult.create({
        data: {
          workId: work.id,
          experimentName: normalized.experimentName,
          groupType: normalized.groupType,
          variantName: normalized.variantName,
          title: normalized.title || work.title,
          intro: normalized.intro,
          coverUrl: normalized.coverUrl,
          coverSource: normalized.coverUrl ? "manual_import" : null,
          exposureCount: normalized.exposureCount,
          clickCount: normalized.clickCount,
          ctr: normalized.ctr,
          playCount: normalized.playCount,
          conversionCount: normalized.conversionCount,
          conversionRate: normalized.conversionRate,
          finishRate: normalized.finishRate,
          revenue: normalized.revenue,
          testStartDate: normalized.testStartDate,
          testEndDate: normalized.testEndDate,
          dataSource: "手动导入",
          note: normalized.note,
        },
      });
      imported += 1;
      touched.add(`${work.id}::${normalized.experimentName}`);
    } catch (error) {
      errors.push({ rowNumber, reason: error instanceof Error ? error.message : "未知导入错误。" });
    }
  }

  let reviewsCreated = 0;

  for (const key of touched) {
    const [workId, experimentName] = key.split("::");
    const review = await createExperimentReview(workId, experimentName);
    if (review) reviewsCreated += 1;
  }

  return {
    success: true,
    imported,
    failed: errors.length,
    skippedEmpty,
    matchedWorks: matchedWorkIds.size,
    unmatchedWorks,
    reviewsCreated,
    unableToReview: Math.max(0, touched.size - reviewsCreated),
    errors,
  };
}

export async function getLatestExperimentReview(workId: string) {
  return prisma.workExperimentReview.findFirst({
    where: { workId },
    include: {
      controlResult: true,
      winnerResult: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getExperimentResultsForWork(workId: string) {
  return prisma.workExperimentResult.findMany({
    where: { workId },
    orderBy: [{ importedAt: "desc" }, { groupType: "asc" }],
    take: 20,
  });
}

export async function applyExperimentWinner(workId: string, reviewId: string) {
  const review = await prisma.workExperimentReview.findFirst({
    where: { id: reviewId, workId },
    include: { winnerResult: true },
  });

  if (!review) {
    throw new Error("未找到对应复盘结论。");
  }

  if (!review.winnerResult) {
    throw new Error("当前复盘没有可采用的胜出版本。");
  }

  return prisma.work.update({
    where: { id: workId },
    data: {
      finalTitle: review.winnerResult.title,
      finalIntro: review.winnerResult.intro || undefined,
      finalCoverUrl: review.winnerResult.coverUrl || undefined,
      finalCoverSource: review.winnerResult.coverUrl ? "experiment_result" : undefined,
      reviewStatus: "approved",
      reviewNote: appendReviewNote(review.conclusion),
      reviewedAt: new Date(),
      reviewerName: "实验复盘",
    },
  });
}

async function createExperimentReview(workId: string, experimentName: string) {
  const results = await prisma.workExperimentResult.findMany({
    where: { workId, experimentName },
    orderBy: { importedAt: "desc" },
  });
  const control = results.find((item) => item.groupType === "control");
  const variants = results.filter((item) => item.groupType === "variant");

  if (!control || variants.length === 0) {
    return null;
  }

  const ranked = variants
    .map((variant) => ({
      variant,
      score: valueScore(variant) - valueScore(control),
    }))
    .sort((a, b) => b.score - a.score);
  const winner = ranked[0]?.variant ?? null;

  if (!winner) return null;

  const ctrLift = lift(winner.ctr, control.ctr);
  const ctrLiftRate = liftRate(winner.ctr, control.ctr);
  const conversionLift = lift(winner.conversionRate, control.conversionRate);
  const conversionLiftRate = liftRate(winner.conversionRate, control.conversionRate);
  const finishRateLift = lift(winner.finishRate, control.finishRate);
  const revenueLift = lift(winner.revenue, control.revenue);
  const confidenceLevel = decideConfidence(control, winner);
  const recommendation = decideRecommendation({ control, winner, confidenceLevel, ctrLift, conversionLift });
  const riskNotes = buildRiskNotes(control, winner, confidenceLevel);
  const evidence = buildEvidence(control, winner, ctrLift, conversionLift, finishRateLift, revenueLift);
  const conclusion = buildConclusion(winner, ctrLift, ctrLiftRate, conversionLift, conversionLiftRate, confidenceLevel, recommendation);

  await prisma.workExperimentReview.deleteMany({
    where: { workId, experimentName },
  });

  return prisma.workExperimentReview.create({
    data: {
      workId,
      experimentName,
      controlResultId: control.id,
      winnerResultId: winner.id,
      conclusion,
      recommendation,
      ctrLift,
      ctrLiftRate,
      conversionLift,
      conversionLiftRate,
      finishRateLift,
      revenueLift,
      confidenceLevel,
      riskNotesJson: JSON.stringify(riskNotes),
      evidenceJson: JSON.stringify(evidence),
    },
  });
}

async function findWorkForExperiment(row: NormalizedExperimentRow) {
  if (row.externalId) {
    const byExternalId = await prisma.work.findFirst({ where: { externalId: row.externalId } });
    if (byExternalId) return byExternalId;
  }

  if (row.sourceTitle && row.author) {
    return prisma.work.findFirst({ where: { title: row.sourceTitle, author: row.author } });
  }

  return prisma.work.findFirst({ where: { title: row.sourceTitle } });
}

function valueScore(result: WorkExperimentResult) {
  return (result.ctr ?? 0) * 100 + (result.conversionRate ?? 0) * 120 + (result.finishRate ?? 0) * 35 + (result.revenue ?? 0) / 1000;
}

function decideConfidence(control: WorkExperimentResult, winner: WorkExperimentResult): ExperimentConfidenceLevel {
  const exposure = Math.min(control.exposureCount ?? 0, winner.exposureCount ?? 0);
  const ctrDiff = Math.abs((winner.ctr ?? 0) - (control.ctr ?? 0));

  if (exposure >= 5000 && ctrDiff >= 0.01) return "high";
  if (exposure >= 1000) return "medium";
  return "low";
}

function decideRecommendation({
  confidenceLevel,
  control,
  ctrLift,
  conversionLift,
  winner,
}: {
  confidenceLevel: ExperimentConfidenceLevel;
  control: WorkExperimentResult;
  ctrLift: number | null;
  conversionLift: number | null;
  winner: WorkExperimentResult;
}): ExperimentRecommendation {
  if (confidenceLevel === "low") return "need_more_data";
  if ((ctrLift ?? 0) > 0 && (conversionLift ?? 0) > 0) return "adopt";
  if ((ctrLift ?? 0) > 0 && control.conversionRate === null && winner.conversionRate === null) return "continue_test";
  if ((ctrLift ?? 0) > 0 && (conversionLift ?? 0) <= 0) return "continue_test";
  if ((ctrLift ?? 0) < 0 && (conversionLift ?? 0) < 0) return "rollback";
  return "need_more_data";
}

function buildRiskNotes(control: WorkExperimentResult, winner: WorkExperimentResult, confidenceLevel: ExperimentConfidenceLevel) {
  const risks: string[] = [];
  if (confidenceLevel === "low") risks.push("曝光量不足，建议继续观察。");
  if (control.conversionRate === null || winner.conversionRate === null) risks.push("缺少转化率数据，无法完整判断转化质量。");
  if (control.finishRate === null || winner.finishRate === null) risks.push("缺少完播率数据，后续需要补充内容质量指标。");
  return risks;
}

function buildEvidence(
  control: WorkExperimentResult,
  winner: WorkExperimentResult,
  ctrLift: number | null,
  conversionLift: number | null,
  finishRateLift: number | null,
  revenueLift: number | null,
) {
  return [
    `对照组：${control.title}`,
    `胜出组：${winner.variantName || winner.title}`,
    `CTR 变化：${formatPercent(ctrLift)}`,
    `转化率变化：${formatPercent(conversionLift)}`,
    `完播率变化：${formatPercent(finishRateLift)}`,
    `收入变化：${revenueLift === null ? "缺失" : revenueLift}`,
  ];
}

function buildConclusion(
  winner: WorkExperimentResult,
  ctrLift: number | null,
  ctrLiftRate: number | null,
  conversionLift: number | null,
  conversionLiftRate: number | null,
  confidenceLevel: ExperimentConfidenceLevel,
  recommendation: ExperimentRecommendation,
) {
  const action = recommendationLabel(recommendation);
  return `${winner.variantName || "实验组"} 的点击率较对照组变化 ${formatPercent(ctrLift)}，相对变化 ${formatPercent(ctrLiftRate)}；转化率变化 ${formatPercent(conversionLift)}，相对变化 ${formatPercent(conversionLiftRate)}。当前置信度为${confidenceLabel(confidenceLevel)}，建议：${action}。`;
}

function recommendationLabel(value: ExperimentRecommendation) {
  const labels: Record<ExperimentRecommendation, string> = {
    adopt: "采用胜出版本",
    continue_test: "继续测试",
    rollback: "回退到对照组",
    need_more_data: "补充数据后再判断",
  };
  return labels[value];
}

function confidenceLabel(value: ExperimentConfidenceLevel) {
  return value === "high" ? "高" : value === "medium" ? "中" : "低";
}

function lift(a: number | null, b: number | null) {
  return typeof a === "number" && typeof b === "number" ? a - b : null;
}

function liftRate(a: number | null, b: number | null) {
  return typeof a === "number" && typeof b === "number" && b !== 0 ? (a - b) / b : null;
}

function formatPercent(value: number | null) {
  return value === null ? "缺失" : `${Math.round(value * 10000) / 100}%`;
}

function appendReviewNote(conclusion: string) {
  return `根据多书名测试复盘人工确认采用。${conclusion}`;
}
