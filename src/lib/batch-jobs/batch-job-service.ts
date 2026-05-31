import type { BatchJob, BatchJobItem, Work } from "@prisma/client";
import {
  identifyWorkWithProviderMode,
  type CandidateWork,
  type FinalMatch,
} from "@/lib/adapters/search-adapter";
import type { CoverAssetView } from "@/lib/cover/cover-types";
import { evaluateCoverWithMock } from "@/lib/cover/cover-evaluator";
import { getLatestCoverAsset, saveCoverEvaluation } from "@/lib/cover/cover-repository";
import { generateTitleIntroWithOpenAI } from "@/lib/generation/llm/openai-title-intro-adapter";
import { generateTitleIntroSuggestions } from "@/lib/generation/title-intro-engine";
import { saveTitleIntroGeneration } from "@/lib/generation/title-intro-repository";
import type { TitleIntroGenerationInput } from "@/lib/generation/title-intro-types";
import { runOpenAIRating } from "@/lib/rating/openai-rating-service";
import type { RatingResult, RenameSuggestion, WorkRating } from "@/lib/rating/rating-types";
import { prisma } from "@/server/db";
import type { BatchJobStep, CreateBatchJobInput } from "@/lib/batch-jobs/batch-job-types";

type BatchJobExecutionOptions = {
  identifyProviderMode: "mock" | "configured";
  titleIntroProvider: "mock" | "openai";
};

type WorkForBatch = Pick<
  Work,
  | "id"
  | "externalId"
  | "contentType"
  | "title"
  | "author"
  | "description"
  | "category"
  | "coverFileName"
  | "currentPlays"
  | "currentCtr"
  | "currentFinish"
  | "notes"
>;

type BatchError = {
  errorCode: string;
  errorMessage: string;
  hint: string;
  provider?: string;
};

const MAX_BATCH_OPENAI_RATING_WORKS = 10;

export async function createBatchJob(input: CreateBatchJobInput) {
  assertCostRiskAccepted(input);
  const uniqueWorkIds = Array.from(new Set(input.workIds.filter(Boolean)));

  if (uniqueWorkIds.length === 0) {
    throw createBatchError("INVALID_WORK_IDS", "请先选择需要执行批量任务的作品。", "workIds 不能为空。");
  }

  if (input.steps.length === 0) {
    throw createBatchError("INVALID_STEPS", "请至少选择一个批量执行步骤。", "steps 不能为空。");
  }

  if (input.steps.includes("rating") && uniqueWorkIds.length > MAX_BATCH_OPENAI_RATING_WORKS) {
    throw createBatchError(
      "OPENAI_RATING_BATCH_LIMIT_EXCEEDED",
      `单次 OpenAI 批量评级最多允许 ${MAX_BATCH_OPENAI_RATING_WORKS} 本作品。`,
      "请拆分批量任务，避免误触发过多付费请求。",
    );
  }

  const totalCount = uniqueWorkIds.length * input.steps.length;
  const job = await prisma.batchJob.create({
    data: {
      type: input.steps.length === 1 ? input.steps[0] : "mixed",
      status: "pending",
      totalCount,
      costRiskAccepted: input.costRiskAccepted,
      note: input.note?.trim() || null,
      providerSummaryJson: JSON.stringify({
        identifyProviderMode: input.identifyProviderMode || "mock",
        configuredSearchProvider: process.env.SEARCH_PROVIDER || "mock",
        titleIntroProvider: input.titleIntroProvider || "mock",
        ratingProvider: "openai",
        maxBatchOpenAIRatingWorks: MAX_BATCH_OPENAI_RATING_WORKS,
      }),
      items: {
        createMany: {
          data: uniqueWorkIds.flatMap((workId) =>
            input.steps.map((step) => ({
              workId,
              step,
              status: "pending",
            })),
          ),
        },
      },
    },
  });

  return getBatchJobDetail(job.id);
}

export function startBatchJobInBackground(jobId: string, options: BatchJobExecutionOptions) {
  void runBatchJob(jobId, options).catch(async (error) => {
    const normalized = normalizeBatchError(error);

    await prisma.batchJob.update({
      where: { id: jobId },
      data: {
        status: "failed",
        finishedAt: new Date(),
        errorSummary: `${normalized.errorCode}: ${normalized.errorMessage}`,
      },
    }).catch(() => undefined);
  });
}

export async function runBatchJob(jobId: string, options: BatchJobExecutionOptions) {
  await prisma.batchJob.update({
    where: { id: jobId },
    data: {
      status: "running",
      startedAt: new Date(),
      errorSummary: null,
    },
  });

  const items = await prisma.batchJobItem.findMany({
    where: { batchJobId: jobId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  for (const item of items) {
    await runBatchJobItem(item, options);
    await summarizeBatchJob(jobId);
  }

  return summarizeBatchJob(jobId);
}

export async function retryBatchJobItem(jobId: string, itemId: string) {
  const item = await prisma.batchJobItem.findFirst({
    where: {
      id: itemId,
      batchJobId: jobId,
    },
    include: {
      batchJob: true,
    },
  });

  if (!item) {
    throw createBatchError("ITEM_NOT_FOUND", "未找到该批量任务项。", "请确认任务项属于当前批量任务。");
  }

  if (item.status !== "failed") {
    throw createBatchError("ITEM_NOT_FAILED", "只有失败的任务项可以重试。", "当前任务项不是 failed 状态。");
  }

  const providerSummary = safeJsonParse<Partial<BatchJobExecutionOptions>>(
    item.batchJob.providerSummaryJson || "{}",
    {},
  );

  await prisma.batchJobItem.update({
    where: { id: item.id },
    data: {
      retryCount: { increment: 1 },
      status: "pending",
      errorCode: null,
      errorMessage: null,
      resultSummaryJson: null,
    },
  });

  await runBatchJobItem(item, {
    identifyProviderMode: providerSummary.identifyProviderMode || "mock",
    titleIntroProvider: providerSummary.titleIntroProvider || "mock",
  });

  return summarizeBatchJob(jobId);
}

async function runBatchJobItem(item: Pick<BatchJobItem, "id" | "workId" | "step">, options: BatchJobExecutionOptions) {
  await prisma.batchJobItem.update({
    where: { id: item.id },
    data: {
      status: "running",
      startedAt: new Date(),
      finishedAt: null,
      errorCode: null,
      errorMessage: null,
    },
  });

  try {
    const summary = await runStep(item.workId, normalizeStep(item.step), options);

    await prisma.batchJobItem.update({
      where: { id: item.id },
      data: {
        status: "skipped" in summary && summary.skipped === true ? "skipped" : "success",
        resultSummaryJson: JSON.stringify(summary),
        finishedAt: new Date(),
      },
    });
  } catch (error) {
    const normalized = normalizeBatchError(error);
    const failureSummary = failedStepSummary(item.step, options, normalized);

    await prisma.batchJobItem.update({
      where: { id: item.id },
      data: {
        status: "failed",
        errorCode: normalized.errorCode,
        errorMessage: JSON.stringify(normalized),
        resultSummaryJson: JSON.stringify(failureSummary),
        finishedAt: new Date(),
      },
    });
  }
}

async function runStep(workId: string, step: BatchJobStep, options: BatchJobExecutionOptions) {
  if (step === "identify") return runIdentifyStep(workId, options.identifyProviderMode);
  if (step === "rating") return runRatingStep(workId);
  if (step === "title_intro") return runTitleIntroStep(workId, options.titleIntroProvider);
  if (step === "cover_evaluation") return runCoverEvaluationStep(workId);

  throw createBatchError("UNSUPPORTED_STEP", "暂不支持该批量步骤。", `step=${String(step)}`);
}

async function runIdentifyStep(workId: string, identifyProviderMode: "mock" | "configured") {
  const work = await getWorkForBatch(workId);
  const result = await identifyWorkWithProviderMode({
    title: work.title,
    author: work.author,
    intro: work.description,
    category: work.category,
    coverFileName: work.coverFileName,
    remark: work.notes,
    externalId: work.externalId,
    contentType: work.contentType,
  }, { searchProviderMode: identifyProviderMode });

  await prisma.workIdentification.create({
    data: {
      workId,
      candidatesJson: JSON.stringify(result.candidates),
      finalMatchJson: JSON.stringify(result.finalMatch),
      confidence: result.confidence,
      reason: result.reason,
      risksJson: JSON.stringify(result.risks),
      searchProvider: result.searchProvider,
      searchQuery: result.searchQuery,
      searchResultsJson: JSON.stringify(result.searchResults),
      evidenceJson: JSON.stringify(result.evidence),
      riskHintsJson: JSON.stringify(result.riskHints),
      sourceSummaryJson: JSON.stringify(result.sourceSummary),
    },
  });

  return {
    provider: result.searchProvider,
    identifyProviderMode,
    actualSearchProvider: result.searchProvider,
    searchFallback: result.sourceSummary.searchFallback ?? false,
    baseURLHost: result.sourceSummary.baseURLHost ?? null,
    httpStatus: result.sourceSummary.httpStatus ?? null,
    rawResultCount: result.sourceSummary.rawResultCount ?? result.searchResults.length,
    normalizedResultCount: result.sourceSummary.normalizedResultCount ?? result.candidates.length,
    searchQuery: result.searchQuery,
    candidateCount: result.candidates.length,
    validEvidenceCount: result.evidence.length,
    filteredCount: result.sourceSummary.filteredResultCount ?? result.sourceSummary.excludedResults?.length ?? 0,
    topCandidateTitle: result.candidates[0]?.title ?? null,
    confidence: result.confidence,
    isPreliminary: result.confidence < 0.65,
  };
}

async function runRatingStep(workId: string) {
  const existing = await prisma.workRatingRun.findFirst({ where: { workId, status: "success" }, orderBy: { createdAt: "desc" } });
  if (existing) {
    return {
      provider: "openai",
      model: existing.model,
      status: "skipped",
      skipped: true,
      ratingRunId: existing.id,
      reason: "该作品已有成功 OpenAI 评级记录，批量任务默认跳过。请在作品详情页手动重新评级。",
    };
  }
  const result = await runOpenAIRating(workId);
  return {
    provider: "openai",
    model: result.model,
    status: result.status,
    ratingRunId: result.id,
    rating: result.rating,
    score: result.score,
    confidence: result.confidence,
    renameSuggestion: result.renameSuggestion,
    adopted: false,
    topEvidenceSummary: result.keyEvidence[0] ?? "",
  };
}

function failedStepSummary(step: string, options: BatchJobExecutionOptions, error: BatchError) {
  const provider = step === "rating"
    ? "openai"
    : step === "title_intro"
      ? options.titleIntroProvider
      : step === "identify"
        ? options.identifyProviderMode
        : "cover_rules";
  return {
    provider,
    model: step === "rating" ? process.env.OPENAI_RATING_MODEL || process.env.OPENAI_TEXT_MODEL || "未配置" : null,
    status: "failed",
    errorCode: error.errorCode,
    errorMessage: error.errorMessage,
  };
}

async function runTitleIntroStep(workId: string, provider: "mock" | "openai") {
  const work = await prisma.work.findUnique({
    where: { id: workId },
    include: {
      identifications: {
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
      ratings: {
        where: { provider: "openai" },
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
    },
  });

  if (!work) {
    throw createBatchError("WORK_NOT_FOUND", "作品不存在。", "请检查作品是否已被删除。");
  }

  const latestIdentification = work.identifications[0] ?? null;
  const latestRating = work.ratings[0] ?? null;
  const identification = parseGenerationIdentification(latestIdentification);
  const rating = parseGenerationRating(latestRating);
  const input: TitleIntroGenerationInput = {
    work: toTitleIntroWorkInput(work),
    identification: identification.value,
    rating: rating.value,
  };
  const result = provider === "openai" ? await generateTitleIntroWithOpenAI(input) : generateTitleIntroSuggestions(input);
  const saved = await saveTitleIntroGeneration({
    workId,
    identificationId: latestIdentification?.id ?? null,
    ratingId: latestRating?.id ?? null,
    result: {
      ...result,
      risks: Array.from(new Set([...result.risks, ...identification.risks, ...rating.risks])),
      evidence: Array.from(
        new Set([
          ...result.evidence,
          provider === "openai" ? "批量生成来源：OpenAI" : "批量生成来源：Mock 规则引擎",
        ]),
      ),
    },
  });

  return {
    provider,
    generationId: saved.id,
    generatedCount: result.titleVariants.length,
    selectedTitlePreview: result.titleVariants[0]?.title ?? null,
    hasCoverPrompt: result.coverPrompts.length > 0,
  };
}

async function runCoverEvaluationStep(workId: string) {
  const work = await prisma.work.findUnique({
    where: { id: workId },
    select: {
      id: true,
      title: true,
      category: true,
      coverFileName: true,
    },
  });

  if (!work) {
    throw createBatchError("WORK_NOT_FOUND", "作品不存在。", "请检查作品是否已被删除。");
  }

  const asset = await getLatestCoverAsset(workId);

  if (!asset) {
    throw createBatchError("COVER_ASSET_REQUIRED", "该作品暂无封面资产，无法执行封面评估。", "请先上传封面或导入封面地址。");
  }

  const result = evaluateCoverWithMock({
    work,
    asset: {
      fileName: asset.fileName,
      originalName: asset.originalName,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
      sourceType: asset.sourceType === "remote_url" ? "remote_url" : "local_upload",
    } satisfies Pick<CoverAssetView, "fileName" | "originalName" | "mimeType" | "sizeBytes" | "sourceType">,
  });

  await saveCoverEvaluation(workId, asset.id, result);

  return {
    coverRating: result.rating,
    coverScore: result.score,
    strategy: result.strategy,
    reason: result.reason,
  };
}

export async function summarizeBatchJob(jobId: string) {
  const grouped = await prisma.batchJobItem.groupBy({
    by: ["status"],
    where: { batchJobId: jobId },
    _count: { _all: true },
  });
  const counts = Object.fromEntries(grouped.map((item) => [item.status, item._count._all]));
  const successCount = counts.success ?? 0;
  const failedCount = counts.failed ?? 0;
  const skippedCount = counts.skipped ?? 0;
  const runningCount = counts.running ?? 0;
  const pendingCount = counts.pending ?? 0;
  const totalCount = successCount + failedCount + skippedCount + runningCount + pendingCount;
  const status =
    runningCount || pendingCount
      ? "running"
      : failedCount && successCount
        ? "partial_success"
        : failedCount && !successCount
          ? "failed"
          : "success";

  return prisma.batchJob.update({
    where: { id: jobId },
    data: {
      status,
      totalCount,
      successCount,
      failedCount,
      skippedCount,
      finishedAt: runningCount || pendingCount ? null : new Date(),
      errorSummary: failedCount ? `失败 ${failedCount} 条，请查看任务项详情。` : null,
    },
    include: {
      items: {
        include: {
          work: {
            select: {
              id: true,
              externalId: true,
              title: true,
              author: true,
            },
          },
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      },
    },
  });
}

export async function getBatchJobDetail(jobId: string) {
  return prisma.batchJob.findUnique({
    where: { id: jobId },
    include: {
      items: {
        include: {
          work: {
            select: {
              id: true,
              externalId: true,
              title: true,
              author: true,
            },
          },
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      },
    },
  });
}

export function assertCostRiskAccepted(input: Pick<CreateBatchJobInput, "steps" | "costRiskAccepted" | "identifyProviderMode" | "titleIntroProvider">) {
  const usesRealSearch = input.identifyProviderMode === "configured" && input.steps.includes("identify");
  const usesOpenAIText = input.titleIntroProvider === "openai" && input.steps.includes("title_intro");
  const usesOpenAIRating = input.steps.includes("rating");

  if ((usesRealSearch || usesOpenAIText || usesOpenAIRating) && !input.costRiskAccepted) {
    throw createBatchError(
      "COST_RISK_NOT_ACCEPTED",
      "当前批量任务可能调用外部 API 并产生费用，请确认成本风险后重试。",
      usesOpenAIRating
        ? "任务包含 OpenAI 正式评级。"
        : usesRealSearch && usesOpenAIText
        ? "任务包含真实搜索和 OpenAI 文本生成。"
        : usesRealSearch
          ? "任务包含真实搜索。"
          : "任务包含 OpenAI 文本生成。",
    );
  }

  if (usesOpenAIText && (!process.env.OPENAI_API_KEY || !process.env.OPENAI_TEXT_MODEL)) {
    throw createBatchError(
      "OPENAI_CONFIG_MISSING",
      "OpenAI 文本生成配置缺失，无法执行批量 OpenAI 生成。",
      "请在服务端环境变量中配置 OPENAI_API_KEY 和 OPENAI_TEXT_MODEL 后重启服务。",
    );
  }

  if (usesOpenAIRating && (!process.env.OPENAI_API_KEY || !(process.env.OPENAI_RATING_MODEL || process.env.OPENAI_TEXT_MODEL))) {
    throw createBatchError(
      "OPENAI_CONFIG_MISSING",
      "OpenAI 正式评级配置缺失，无法执行批量评级。",
      "请在服务端配置 OPENAI_API_KEY，并配置 OPENAI_RATING_MODEL 或 OPENAI_TEXT_MODEL 后重启服务。",
    );
  }
}

function parseGenerationIdentification(
  identification:
    | {
        confidence: number;
        finalMatchJson: string;
        candidatesJson: string;
        risksJson: string;
        reason: string;
      }
    | null,
): { value: NonNullable<TitleIntroGenerationInput["identification"]>; risks: string[] } {
  if (!identification) {
    return {
      value: {
        confidence: 0,
        finalMatch: null,
        candidates: [],
        risks: ["尚未进行作品识别。"],
        reason: "",
      },
      risks: ["尚未进行作品识别，生成建议置信度较低。"],
    };
  }

  const risks: string[] = [];

  return {
    value: {
      confidence: identification.confidence,
      finalMatch: safeJsonParse<FinalMatch | null>(identification.finalMatchJson, null, () => risks.push("识别最终匹配解析失败。")),
      candidates: safeJsonParse<CandidateWork[]>(identification.candidatesJson, [], () => risks.push("识别候选作品解析失败。")),
      risks: safeJsonParse<string[]>(identification.risksJson, [], () => risks.push("识别风险解析失败。")),
      reason: identification.reason || "",
    },
    risks,
  };
}

function parseGenerationRating(
  rating:
    | {
        rating: string;
        score: number;
        confidence: number;
        reasonsJson: string;
        risksJson: string;
        evidenceJson: string;
        renameSuggestion: string;
        renameReason: string;
      }
    | null,
): { value: RatingResult; risks: string[] } {
  if (!rating) {
    return {
      value: {
        rating: "C",
        score: 50,
        confidence: 0.3,
        reasons: ["尚未进行作品评级，使用保守默认评级。"],
        risks: ["缺少评级结果，生成建议置信度较低。"],
        evidence: [],
        renameSuggestion: "cautious",
        renameReason: "缺少正式评级结果，仅生成保守优化建议。",
      },
      risks: ["尚未进行作品评级，生成建议置信度较低。"],
    };
  }

  const risks: string[] = [];

  return {
    value: {
      rating: normalizeRating(rating.rating),
      score: rating.score,
      confidence: rating.confidence,
      reasons: safeJsonParse<string[]>(rating.reasonsJson, [], () => risks.push("评级理由解析失败。")),
      risks: safeJsonParse<string[]>(rating.risksJson, [], () => risks.push("评级风险解析失败。")),
      evidence: safeJsonParse<string[]>(rating.evidenceJson, [], () => risks.push("评级证据解析失败。")),
      renameSuggestion: normalizeRenameSuggestion(rating.renameSuggestion),
      renameReason: rating.renameReason || "",
    },
    risks,
  };
}

function toTitleIntroWorkInput(work: WorkForBatch): TitleIntroGenerationInput["work"] {
  return {
    id: work.id,
    title: work.title || "",
    author: work.author || "",
    intro: work.description || "",
    category: work.category || "",
    coverFileName: work.coverFileName || "",
    remark: work.notes || "",
    playCount: work.currentPlays ?? null,
    clickRate: work.currentCtr ?? null,
    completionRate: work.currentFinish ?? null,
  };
}

async function getWorkForBatch(workId: string): Promise<WorkForBatch> {
  const work = await prisma.work.findUnique({
    where: { id: workId },
    select: {
      id: true,
      externalId: true,
      contentType: true,
      title: true,
      author: true,
      description: true,
      category: true,
      coverFileName: true,
      currentPlays: true,
      currentCtr: true,
      currentFinish: true,
      notes: true,
    },
  });

  if (!work) {
    throw createBatchError("WORK_NOT_FOUND", "作品不存在。", "请检查作品是否已被删除。");
  }

  return work;
}

function normalizeStep(value: string): BatchJobStep {
  if (value === "identify" || value === "rating" || value === "title_intro" || value === "cover_evaluation") {
    return value;
  }

  throw createBatchError("UNSUPPORTED_STEP", "暂不支持该批量步骤。", `step=${value}`);
}

function normalizeRating(value: string): WorkRating {
  return value === "S" || value === "A" || value === "B" || value === "C" || value === "D" ? value : "C";
}

function normalizeRenameSuggestion(value: string): RenameSuggestion {
  if (value === "avoid" || value === "cautious" || value === "recommended" || value === "strongly_recommended") {
    return value;
  }

  return "cautious";
}

function safeJsonParse<T>(value: string, fallback: T, onError?: () => void): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    onError?.();
    return fallback;
  }
}

function createBatchError(errorCode: string, errorMessage: string, hint: string): Error & BatchError {
  const error = new Error(errorMessage) as Error & BatchError;
  error.errorCode = errorCode;
  error.errorMessage = errorMessage;
  error.hint = hint;
  return error;
}

export function normalizeBatchError(error: unknown): BatchError {
  if (isBatchError(error)) {
    return {
      errorCode: error.errorCode,
      errorMessage: error.errorMessage,
      hint: error.hint,
      provider: error.provider,
    };
  }

  return {
    errorCode: "UNKNOWN_ERROR",
    errorMessage: error instanceof Error ? error.message : "未知错误。",
    hint: "请查看作品数据是否完整，或稍后重试该任务项。",
  };
}

function isBatchError(error: unknown): error is BatchError {
  return (
    typeof error === "object" &&
    error !== null &&
    "errorCode" in error &&
    "errorMessage" in error &&
    "hint" in error
  );
}

export function toPublicBatchError(error: unknown) {
  return normalizeBatchError(error);
}

export type BatchJobWithItems = BatchJob & {
  items: Array<
    BatchJobItem & {
      work: {
        id: string;
        externalId: string | null;
        title: string;
        author: string | null;
      };
    }
  >;
};
