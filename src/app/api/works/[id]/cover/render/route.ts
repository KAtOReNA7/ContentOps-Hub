import { NextResponse } from "next/server";
import { getLatestCoverRenders, toCoverRenderView } from "@/lib/cover-render/cover-render-repository";
import type { CoverRenderRatio, CoverRenderTitleOption } from "@/lib/cover-render/cover-render-types";
import { renderCoverVariants } from "@/lib/cover-render/cover-render-service";
import type { CoverStrategy } from "@/lib/cover/cover-types";
import type { TitleVariantSuggestion } from "@/lib/generation/title-intro-types";
import { prisma } from "@/server/db";

export const runtime = "nodejs";

type CoverRenderRouteProps = {
  params: Promise<{ id: string }>;
};

type CoverRenderRequest = {
  titleText?: string;
  strategy?: CoverStrategy;
  ratios?: CoverRenderRatio[];
};

export async function GET(_request: Request, { params }: CoverRenderRouteProps) {
  try {
    const { id } = await params;
    const [renders, latestGeneration, latestEvaluation] = await Promise.all([
      getLatestCoverRenders(id),
      prisma.workTitleIntroGeneration.findFirst({
        where: { workId: id },
        orderBy: { createdAt: "desc" },
      }),
      prisma.workCoverEvaluation.findFirst({
        where: { workId: id },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        renders: renders.map(toCoverRenderView),
        titleOptions: latestGeneration ? titleOptionsFromGeneration(latestGeneration.titleVariantsJson) : [],
        defaultStrategy: latestEvaluation?.confirmedStrategy || latestEvaluation?.strategy || null,
      },
    });
  } catch (error) {
    return structuredError("Failed to read cover renders.", [errorMessage(error)], 500);
  }
}

export async function POST(request: Request, { params }: CoverRenderRouteProps) {
  try {
    const { id } = await params;
    const body = (await request.json()) as CoverRenderRequest;
    const titleText = body.titleText?.trim() ?? "";
    const strategy = body.strategy ?? "keep_and_optimize_layout";
    const ratios: CoverRenderRatio[] = Array.isArray(body.ratios) ? body.ratios : ["1:1", "3:4"];

    if (!titleText) {
      return structuredError("Title text is required.", ["请输入或选择新版封面标题。"], 400);
    }

    if (strategy !== "keep_and_replace_title" && strategy !== "keep_and_optimize_layout") {
      return structuredError("Cover strategy is not supported for render.", ["V1 仅支持保留主体换标题或保留主体优化版式。"], 400);
    }

    const renders = await renderCoverVariants({
      workId: id,
      titleText,
      strategy,
      ratios,
    });

    return NextResponse.json({
      success: true,
      data: {
        renders,
      },
    });
  } catch (error) {
    return structuredError("Failed to render cover variants.", [errorMessage(error)], 500);
  }
}

function titleOptionsFromGeneration(value: string): CoverRenderTitleOption[] {
  try {
    const variants = JSON.parse(value) as TitleVariantSuggestion[];

    return variants
      .filter((variant) => variant.title)
      .slice(0, 5)
      .map((variant) => ({
        title: variant.title,
        reason: variant.reason,
      }));
  } catch {
    return [];
  }
}

function structuredError(message: string, errors: string[], status: number) {
  return NextResponse.json({ success: false, message, errors }, { status });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error.";
}
