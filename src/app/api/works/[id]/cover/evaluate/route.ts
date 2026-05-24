import { NextResponse } from "next/server";
import { evaluateCoverWithMock } from "@/lib/cover/cover-evaluator";
import { getLatestCoverAsset, getLatestCoverEvaluation, saveCoverEvaluation, toCoverEvaluationView } from "@/lib/cover/cover-repository";
import { prisma } from "@/server/db";

export const runtime = "nodejs";

type CoverEvaluateRouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: CoverEvaluateRouteProps) {
  try {
    const { id } = await params;
    const evaluation = await getLatestCoverEvaluation(id);

    return NextResponse.json({
      success: true,
      data: evaluation ? toCoverEvaluationView(evaluation) : null,
    });
  } catch (error) {
    return structuredError("Failed to read cover evaluation.", [errorMessage(error)], 500);
  }
}

export async function POST(_request: Request, { params }: CoverEvaluateRouteProps) {
  try {
    const { id } = await params;
    const work = await prisma.work.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        category: true,
        coverFileName: true,
      },
    });

    if (!work) {
      return structuredError("Work not found.", ["No work exists for the provided id."], 404);
    }

    const asset = await getLatestCoverAsset(id);

    if (!asset) {
      return structuredError("Cover asset is required.", ["Upload a current cover before running cover evaluation."], 400);
    }

    const result = evaluateCoverWithMock({
      work,
      asset: {
        fileName: asset.fileName,
        originalName: asset.originalName,
        mimeType: asset.mimeType,
        sizeBytes: asset.sizeBytes,
        sourceType: asset.sourceType === "remote_url" ? "remote_url" : "local_upload",
      },
    });
    const saved = await saveCoverEvaluation(id, asset.id, result);

    return NextResponse.json({
      success: true,
      data: toCoverEvaluationView(saved),
    });
  } catch (error) {
    return structuredError("Failed to evaluate cover asset.", [errorMessage(error)], 500);
  }
}

function structuredError(message: string, errors: string[], status: number) {
  return NextResponse.json({ success: false, message, errors }, { status });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error.";
}
