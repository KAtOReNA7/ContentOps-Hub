import { NextResponse } from "next/server";
import { generateFeedbackInsight, getLatestFeedbackInsight } from "@/lib/feedback/feedback-service";

export const runtime = "nodejs";

type RouteProps = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: RouteProps) {
  try {
    const { id } = await params;
    return NextResponse.json({ success: true, data: toView(await getLatestFeedbackInsight(id)) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(_: Request, { params }: RouteProps) {
  try {
    const { id } = await params;
    return NextResponse.json({ success: true, data: toView(await generateFeedbackInsight(id)) });
  } catch (error) {
    return errorResponse(error);
  }
}

function toView(insight: Awaited<ReturnType<typeof getLatestFeedbackInsight>>) {
  if (!insight) return null;
  return {
    id: insight.id,
    experimentReviewId: insight.experimentReviewId,
    originalRating: insight.originalRating,
    originalScore: insight.originalScore,
    originalRenameSuggestion: insight.originalRenameSuggestion,
    originalCoverStrategy: insight.originalCoverStrategy,
    finalRecommendation: insight.finalRecommendation,
    actualOutcome: insight.actualOutcome,
    ratingAccuracy: insight.ratingAccuracy,
    titleStrategyEffect: insight.titleStrategyEffect,
    coverStrategyEffect: insight.coverStrategyEffect,
    keyLiftMetric: insight.keyLiftMetric,
    summary: insight.summary,
    liftSummary: safeJson(insight.liftSummaryJson, {}),
    evidence: safeJson(insight.evidenceJson, []),
    riskNotes: safeJson(insight.riskNotesJson, []),
    strategyTags: safeJson(insight.strategyTagsJson, []),
    createdAt: insight.createdAt.toISOString(),
  };
}

function safeJson<T>(value: string, fallback: T): T {
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

function errorResponse(error: unknown) {
  return NextResponse.json(
    {
      success: false,
      message: "生成效果回流洞察失败。",
      errors: [error instanceof Error ? error.message : "未知错误。"],
    },
    { status: 500 },
  );
}
