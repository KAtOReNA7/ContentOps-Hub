import type { CoverAsset, WorkCoverEvaluation } from "@prisma/client";
import type {
  CoverAssetSourceType,
  CoverAssetStatus,
  CoverAssetView,
  CoverEvaluationResult,
  CoverEvaluationView,
  CoverStrategy,
} from "@/lib/cover/cover-types";
import { prisma } from "@/server/db";

export function toCoverAssetView(asset: CoverAsset): CoverAssetView {
  return {
    id: asset.id,
    fileName: asset.fileName,
    originalName: asset.originalName,
    mimeType: asset.mimeType,
    sizeBytes: asset.sizeBytes,
    sourceType: normalizeSourceType(asset.sourceType),
    remoteUrl: asset.remoteUrl,
    status: normalizeAssetStatus(asset.status),
    errorMessage: asset.errorMessage,
    url: `/api/cover-assets/${asset.id}/file`,
    createdAt: asset.createdAt.toISOString(),
  };
}

export function toCoverEvaluationView(evaluation: WorkCoverEvaluation): CoverEvaluationView {
  return {
    evaluationId: evaluation.id,
    coverAssetId: evaluation.coverAssetId,
    score: evaluation.score,
    rating: normalizeRating(evaluation.rating),
    strengths: safeJsonParse<string[]>(evaluation.strengthsJson, []),
    weaknesses: safeJsonParse<string[]>(evaluation.weaknessesJson, []),
    strategy: normalizeStrategy(evaluation.strategy),
    reason: evaluation.reason,
    confirmed: evaluation.confirmed,
    confirmedStrategy: evaluation.confirmedStrategy ? normalizeStrategy(evaluation.confirmedStrategy) : null,
    reviewNote: evaluation.reviewNote,
    confirmedAt: evaluation.confirmedAt?.toISOString() ?? null,
    createdAt: evaluation.createdAt.toISOString(),
  };
}

export async function getLatestCoverAsset(workId: string) {
  return prisma.coverAsset.findFirst({
    where: { workId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getLatestCoverEvaluation(workId: string) {
  return prisma.workCoverEvaluation.findFirst({
    where: { workId },
    orderBy: { createdAt: "desc" },
  });
}

export async function saveCoverEvaluation(workId: string, coverAssetId: string, result: CoverEvaluationResult) {
  return prisma.workCoverEvaluation.create({
    data: {
      workId,
      coverAssetId,
      score: result.score,
      rating: result.rating,
      strengthsJson: JSON.stringify(result.strengths),
      weaknessesJson: JSON.stringify(result.weaknesses),
      strategy: result.strategy,
      reason: result.reason,
    },
  });
}

export function normalizeStrategy(value: string): CoverStrategy {
  if (
    value === "keep_and_replace_title" ||
    value === "keep_and_optimize_layout" ||
    value === "redraw_cover"
  ) {
    return value;
  }

  return "keep_and_optimize_layout";
}

function normalizeRating(value: string): "A" | "B" | "C" | "D" {
  return value === "A" || value === "B" || value === "C" || value === "D" ? value : "C";
}

function normalizeSourceType(value: string): CoverAssetSourceType {
  return value === "remote_url" ? "remote_url" : "local_upload";
}

function normalizeAssetStatus(value: string): CoverAssetStatus {
  if (value === "unchecked" || value === "available" || value === "error") {
    return value;
  }

  return "available";
}

function safeJsonParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
