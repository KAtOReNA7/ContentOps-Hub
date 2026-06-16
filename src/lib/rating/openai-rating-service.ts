import { applyCandidateRelevanceGate, type CandidateWork, type FinalMatch, type SearchEvidence, type SourceSummary } from "@/lib/adapters/search-adapter";
import { generateRatingWithOpenAI, OpenAIRatingValidationError, OPENAI_RATING_PROMPT_VERSION } from "@/lib/rating/openai-rating-provider";
import type { OpenAIRatingResultPayload, RatingInput, RatingResult, RatingSupplementInput } from "@/lib/rating/rating-types";
import { prisma } from "@/server/db";
import { normalizeContentType, normalizeSearchEvidenceForRating } from "@/lib/evidence/source-taxonomy";
import { appendRatingRecoveryHint, mapRatingFailureToUserMessage, mapRatingInvalidReasonToUserMessage } from "@/lib/rating/rating-error-messages";

export async function runOpenAIRating(workId: string, options: { adoptResult?: boolean } = {}) {
  const snapshot = await buildRatingSnapshot(workId);
  const model = process.env.OPENAI_RATING_MODEL || process.env.OPENAI_TEXT_MODEL || "未配置";
  const run = await prisma.workRatingRun.create({
    data: {
      workId,
      identificationId: snapshot.identificationId,
      model,
      promptVersion: OPENAI_RATING_PROMPT_VERSION,
      inputSnapshotJson: JSON.stringify(snapshot.input),
      status: "running",
    },
  });

  try {
    const generated = await generateRatingWithOpenAI(snapshot.input);
    const rating = generated.result.ratingResult;
    const saved = await prisma.workRatingRun.update({
      where: { id: run.id },
      data: {
        rating: rating.rating,
        score: rating.score,
        confidence: rating.confidence,
        renameSuggestion: rating.renameSuggestion,
        reasonJson: JSON.stringify({
          reasonSummary: rating.reasonSummary,
          operationAdvice: rating.operationAdvice,
          missingEvidence: generated.result.missingEvidence,
          titleOptimizationPotential: rating.titleOptimizationPotential,
          coverOptimizationPotential: rating.coverOptimizationPotential,
          hasIpAdaptationEvidence: rating.hasIpAdaptationEvidence,
          hasSocialHeatEvidence: rating.hasSocialHeatEvidence,
          hasAuthorInfluenceEvidence: rating.hasAuthorInfluenceEvidence,
          searchResultAnalysis: generated.result.searchResultAnalysis,
          acceptedEvidence: generated.result.acceptedEvidence,
          uncertainEvidence: generated.result.uncertainEvidence,
          rejectedEvidence: generated.result.rejectedEvidence,
          evidenceTags: generated.result.evidenceTags,
        }),
        risksJson: JSON.stringify(rating.riskNotes),
        evidenceJson: JSON.stringify(rating.keyEvidence),
        evidenceWeightingJson: JSON.stringify(rating.evidenceWeighting),
        rawResponseJson: JSON.stringify(generated.result),
        model: generated.diagnostics.model,
        baseURLHost: generated.diagnostics.baseURLHost,
        status: "success",
      },
    });

    if (options.adoptResult) await adoptOpenAIRatingRun(workId, saved.id);
    return getRatingRun(saved.id);
  } catch (error) {
    const isInvalid = error instanceof OpenAIRatingValidationError;
    const errorMessage = appendRatingRecoveryHint(
      isInvalid ? mapRatingInvalidReasonToUserMessage(safeErrorMessage(error)) : mapRatingFailureToUserMessage(error),
    );
    await prisma.workRatingRun.update({
      where: { id: run.id },
      data: { status: isInvalid ? "invalid" : "failed", errorMessage },
    });
    throw new Error(errorMessage);
  }
}

export async function adoptOpenAIRatingRun(workId: string, runId: string) {
  const run = await prisma.workRatingRun.findFirst({ where: { id: runId, workId, status: "success" } });
  if (!run) throw new Error("未找到可采用的 OpenAI 评级记录。");
  const result = toOpenAIRatingResult(run);
  const projection: RatingResult = {
    rating: result.rating,
    score: result.score,
    confidence: result.confidence,
    reasons: [result.reasonSummary],
    risks: result.riskNotes,
    evidence: result.keyEvidence,
    renameSuggestion: result.renameSuggestion,
    renameReason: result.operationAdvice,
  };
  return prisma.$transaction(async (tx) => {
    await tx.workRatingRun.updateMany({ where: { workId, adopted: true }, data: { adopted: false } });
    await tx.workRatingRun.update({ where: { id: run.id }, data: { adopted: true } });
    await tx.workRating.create({
      data: {
        workId,
        identificationId: run.identificationId,
        rating: projection.rating,
        score: projection.score,
        confidence: projection.confidence,
        reasonsJson: JSON.stringify(projection.reasons),
        risksJson: JSON.stringify(projection.risks),
        evidenceJson: JSON.stringify(projection.evidence),
        renameSuggestion: projection.renameSuggestion,
        renameReason: projection.renameReason,
        provider: "openai",
        ratingRunId: run.id,
      },
    });
    return getRatingRun(run.id, tx);
  });
}

export async function listOpenAIRatingRuns(workId: string) {
  const runs = await prisma.workRatingRun.findMany({ where: { workId }, orderBy: { createdAt: "desc" } });
  const legacyRating = await prisma.workRating.findFirst({ where: { workId, provider: { not: "openai" } }, orderBy: { createdAt: "asc" } });
  const publicRuns = runs.map(toPublicRatingRun);
  return {
    runs: publicRuns,
    latestRun: publicRuns[0] ?? null,
    latestSuccessfulRun: publicRuns.find((run) => run.status === "success") ?? null,
    adoptedRun: publicRuns.find((run) => run.adopted) ?? null,
    latestInvalidOrFailedRun: publicRuns.find((run) => run.status === "invalid" || run.status === "failed") ?? null,
    legacyRating: legacyRating ? { ...legacyRating, provider: "legacy_rules", label: "历史规则评级，仅供参考，不参与当前正式评级" } : null,
  };
}

export async function createRatingSupplement(workId: string, input: RatingSupplementInput) {
  return prisma.workRatingSupplement.create({ data: { workId, ...input } });
}

export async function listRatingSupplements(workId: string) {
  return prisma.workRatingSupplement.findMany({ where: { workId }, orderBy: { createdAt: "desc" } });
}

export async function deleteRatingSupplement(workId: string, supplementId: string) {
  const record = await prisma.workRatingSupplement.findFirst({ where: { id: supplementId, workId } });
  if (!record) throw new Error("未找到补充证据。");
  await prisma.workRatingSupplement.delete({ where: { id: record.id } });
}

async function getRatingRun(runId: string, tx: Pick<typeof prisma, "workRatingRun"> = prisma) {
  const run = await tx.workRatingRun.findUnique({ where: { id: runId } });
  if (!run) throw new Error("评级记录保存失败。");
  return toPublicRatingRun(run);
}

async function buildRatingSnapshot(workId: string) {
  const work = await prisma.work.findUnique({
    where: { id: workId },
    include: {
      identifications: { orderBy: { updatedAt: "desc" }, take: 1 },
      coverEvaluations: { orderBy: { updatedAt: "desc" }, take: 1 },
      experimentReviews: { orderBy: { updatedAt: "desc" }, take: 1 },
      feedbackInsights: { orderBy: { updatedAt: "desc" }, take: 1 },
      ratingSupplements: { orderBy: { createdAt: "desc" } },
      ratingRuns: { where: { adopted: true }, orderBy: { updatedAt: "desc" }, take: 1 },
    },
  });
  if (!work) throw new Error("作品不存在。");
  const record = work.identifications[0] ?? null;
  const identification = parseIdentification(work, record);
  const contentType = normalizeContentType(work.contentType);
  const normalizedEvidence = normalizeSearchEvidenceForRating(identification?.candidates ?? [], contentType);
  const supplements = work.ratingSupplements.map(({ sourceType, title, content, evidenceUrl, evidencePlatform, importance }) => ({
    sourceType, title, content, evidenceUrl, evidencePlatform, importance: normalizeImportance(importance),
  }));
  const input: RatingInput & { supplements: RatingSupplementInput[]; context: Record<string, unknown> } = {
    work: {
      id: work.id, title: work.title, author: work.author, importedTitle: work.title, importedAuthor: work.author,
      titleForMatching: work.title, authorForMatching: work.author, titleForEvaluation: work.title, authorForEvaluation: work.author,
      intro: work.description, category: work.category, contentType,
      coverFileName: work.coverFileName, remark: work.notes, notes: work.notes, playCount: work.currentPlays, clickRate: work.currentCtr,
      completionRate: work.currentFinish,
    },
    identification: identification ? { ...identification, candidates: [], evidence: [], sourceSummary: null } : null,
    supplements,
    context: {
      contentType,
      workAuthority: "导入表格或手动录入的 Work.title / Work.author 是正式匹配和评级权威源。",
      authorConfidence: work.author ? "imported_author" : "missing_author",
      legacyIdentificationConfirmation: record?.confirmed ? {
        confirmedTitle: record.confirmedTitle,
        confirmedAuthor: record.confirmedAuthor,
        boundary: "历史兼容信息，不得覆盖 Work.title / Work.author，也不是评级前置条件。",
      } : null,
      searchEvidence: normalizedEvidence.selectedEvidence,
      missingEvidence: buildMissingEvidence(contentType, normalizedEvidence.sourceDiagnostics),
      filteredOutSummary: normalizedEvidence.filteredOutResults,
      sourceDiagnostics: normalizedEvidence.sourceDiagnostics,
      coverModuleSummary: work.coverEvaluations[0] ? {
        coverScore: work.coverEvaluations[0].score,
        coverRating: work.coverEvaluations[0].rating,
        strategy: work.coverEvaluations[0].confirmedStrategy || work.coverEvaluations[0].strategy,
        reason: work.coverEvaluations[0].reason,
        coverWeaknesses: safeJsonParse<string[]>(work.coverEvaluations[0].weaknessesJson, []),
        boundary: "仅用于封面优化建议，不得用于作品价值评级扣分。",
      } : null,
      experimentReview: work.experimentReviews[0] ?? null,
      feedbackInsight: work.feedbackInsights[0] ?? null,
      previousAdoptedRating: work.ratingRuns[0] ? toPublicRatingRun(work.ratingRuns[0]) : null,
    },
  };
  return { input, identificationId: record?.id ?? null };
}

function buildMissingEvidence(contentType: string, diagnostics: { tier1Count: number; tier3Count: number }) {
  const missing: string[] = [];
  if (!diagnostics.tier1Count) missing.push("缺少首发站点或官方来源证据，仅提示补充，不作为扣分依据。");
  if ((contentType === "audiobook" || contentType === "audio_drama") && !diagnostics.tier3Count) {
    missing.push("缺少音频平台播放量、评论、订阅、付费或榜单数据，仅提示补充，不作为扣分依据。");
  }
  return missing;
}

function parseIdentification(work: { title: string; author: string | null; description: string; category: string | null; contentType: string; coverFileName: string | null; notes: string | null; externalId: string | null }, record: {
  confidence: number; confirmed: boolean; confirmedTitle: string | null; confirmedAuthor: string | null;
  finalMatchJson: string; candidatesJson: string; risksJson: string; reason: string; evidenceJson: string; sourceSummaryJson: string;
} | null): RatingInput["identification"] {
  if (!record) return null;
  const finalMatch = safeJsonParse<FinalMatch | null>(record.finalMatchJson, null);
  const candidates = safeJsonParse<CandidateWork[]>(record.candidatesJson, []);
  const sourceSummary = safeJsonParse<SourceSummary | null>(record.sourceSummaryJson, null);
  const gated = applyCandidateRelevanceGate({
    title: work.title,
    author: work.author,
    intro: work.description, category: work.category, coverFileName: work.coverFileName, remark: work.notes, externalId: work.externalId, contentType: work.contentType,
  }, candidates, sourceSummary);
  return {
    confidence: record.confidence, confirmed: record.confirmed, finalMatch, candidates: gated.candidates,
    risks: safeJsonParse<string[]>(record.risksJson, []), reason: record.reason,
    evidence: safeJsonParse<SearchEvidence[]>(record.evidenceJson, []), sourceSummary: gated.sourceSummary,
  };
}

function toPublicRatingRun(run: {
  id: string; workId: string; provider: string; model: string; promptVersion: string; status: string; adopted: boolean;
  rating: string | null; score: number | null; confidence: number | null; renameSuggestion: string | null;
  reasonJson: string; risksJson: string; evidenceJson: string; evidenceWeightingJson: string; errorMessage: string | null;
  rawResponseJson?: string | null; inputSnapshotJson?: string; createdAt: Date; updatedAt?: Date;
}) {
  const reason = safeJsonParse(run.reasonJson, {
    reasonSummary: "", operationAdvice: "", missingEvidence: [], titleOptimizationPotential: "low", coverOptimizationPotential: "low",
    hasIpAdaptationEvidence: false, hasSocialHeatEvidence: false, hasAuthorInfluenceEvidence: false,
    searchResultAnalysis: [], acceptedEvidence: [], uncertainEvidence: [], rejectedEvidence: [], evidenceTags: emptyEvidenceTags(),
  });
  const missingEvidenceDetails = normalizeMissingEvidence(reason.missingEvidence);
  return {
    id: run.id, workId: run.workId, provider: run.provider, model: run.model, promptVersion: run.promptVersion,
    status: run.status, adopted: run.adopted, rating: run.rating, score: run.score, confidence: run.confidence,
    renameSuggestion: run.renameSuggestion, ...reason, missingEvidence: missingEvidenceDetails.map((item) => item.reason), missingEvidenceDetails,
    riskNotes: safeJsonParse<string[]>(run.risksJson, []), keyEvidence: safeJsonParse<string[]>(run.evidenceJson, []),
    evidenceWeighting: safeJsonParse(run.evidenceWeightingJson, []), errorMessage: run.errorMessage, createdAt: run.createdAt,
    updatedAt: run.updatedAt ?? run.createdAt, inputSnapshot: safeJsonParse(run.inputSnapshotJson ?? "{}", {}),
    rawResponse: run.rawResponseJson ? safeJsonParse(run.rawResponseJson, null) : null,
  };
}

function toOpenAIRatingResult(run: Parameters<typeof toPublicRatingRun>[0]): OpenAIRatingResultPayload {
  const view = toPublicRatingRun(run);
  if (!view.rating || view.score === null || view.confidence === null || !view.renameSuggestion) throw new Error("OpenAI 评级记录不完整。");
  return view as OpenAIRatingResultPayload;
}

function safeJsonParse<T>(value: string, fallback: T): T {
  try { return JSON.parse(value) as T; } catch { return fallback; }
}
function normalizeMissingEvidence(value: unknown): Array<{ type: string; reason: string; shouldPenalize: false }> {
  if (!Array.isArray(value)) return [];
  return value.map((item) => typeof item === "string"
    ? { type: "legacy", reason: item, shouldPenalize: false as const }
    : isRecord(item) && typeof item.reason === "string"
      ? { type: typeof item.type === "string" ? item.type : "other", reason: item.reason, shouldPenalize: false as const }
      : null).filter((item): item is { type: string; reason: string; shouldPenalize: false } => item !== null);
}
function emptyEvidenceTags() {
  return {
    hasPrimaryPlatformEvidence: false, primaryPlatforms: [], hasTrustedThirdPartyEvidence: false, trustedThirdPartyPlatforms: [],
    hasAudioEvidence: false, audioPlatforms: [], hasSocialHeatEvidence: false, socialHeatSources: [],
    hasIpAdaptationEvidence: false, ipAdaptationTypes: [], hasAuthorInfluenceEvidence: false, authorInfluenceSources: [],
  };
}
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function safeErrorMessage(error: unknown) { return error instanceof Error ? error.message : "未知错误"; }
function normalizeImportance(value: string): "high" | "medium" | "low" { return value === "high" || value === "low" ? value : "medium"; }
