import { NextResponse } from "next/server";
import { normalizeStrategy, toCoverEvaluationView } from "@/lib/cover/cover-repository";
import { prisma } from "@/server/db";

export const runtime = "nodejs";

type CoverConfirmRouteProps = {
  params: Promise<{ id: string }>;
};

type ConfirmCoverRequest = {
  evaluationId?: string;
  confirmedStrategy?: string;
  reviewNote?: string;
};

export async function POST(request: Request, { params }: CoverConfirmRouteProps) {
  try {
    const { id } = await params;
    const body = (await request.json()) as ConfirmCoverRequest;

    if (!body.evaluationId) {
      return structuredError("evaluationId is required.", ["Run cover evaluation before confirming a strategy."], 400);
    }

    const evaluation = await prisma.workCoverEvaluation.findFirst({
      where: {
        id: body.evaluationId,
        workId: id,
      },
    });

    if (!evaluation) {
      return structuredError("Cover evaluation not found.", ["No cover evaluation exists for the provided id."], 404);
    }

    const confirmedStrategy = normalizeStrategy(body.confirmedStrategy || evaluation.strategy);
    const saved = await prisma.workCoverEvaluation.update({
      where: { id: evaluation.id },
      data: {
        confirmed: true,
        confirmedStrategy,
        reviewNote: body.reviewNote?.trim() || null,
        confirmedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Cover strategy confirmed.",
      data: toCoverEvaluationView(saved),
    });
  } catch (error) {
    return structuredError("Failed to confirm cover strategy.", [errorMessage(error)], 500);
  }
}

function structuredError(message: string, errors: string[], status: number) {
  return NextResponse.json({ success: false, message, errors }, { status });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error.";
}
