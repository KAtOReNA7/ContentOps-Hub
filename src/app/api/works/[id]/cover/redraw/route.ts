import { NextResponse } from "next/server";
import type { CoverRenderRatio } from "@/lib/cover-render/cover-render-types";
import { toCoverRenderView } from "@/lib/cover-render/cover-render-repository";
import type { CoverStrategy } from "@/lib/cover/cover-types";
import type { TitleVariantSuggestion } from "@/lib/generation/title-intro-types";
import { redrawCoverWithChatGPTImage2 } from "@/lib/image-generation/image-generation-service";
import { prisma } from "@/server/db";

export const runtime = "nodejs";

type CoverRedrawRouteProps = {
  params: Promise<{ id: string }>;
};

type CoverRedrawRequest = {
  titleText?: string;
  titleSuggestionIndex?: number;
  ratios?: CoverRenderRatio[];
  confirmCost?: boolean;
};

export async function GET(_request: Request, { params }: CoverRedrawRouteProps) {
  try {
    const { id } = await params;
    const [renders, latestGeneration, latestEvaluation] = await Promise.all([
      prisma.workCoverRender.findMany({
        where: {
          workId: id,
          strategy: "redraw_cover",
          provider: "chatgpt_image2",
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
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
        renders: renders.map(toCoverRenderView).map(toCoverRedrawResponse),
        titleOptions: titleOptionsFromGeneration(latestGeneration?.titleVariantsJson ?? null),
        effectiveStrategy: latestEvaluation ? normalizeStrategy(latestEvaluation.confirmedStrategy || latestEvaluation.strategy) : null,
      },
    });
  } catch (error) {
    return structuredError("Failed to read cover redraw records.", [errorMessage(error)], 500);
  }
}

export async function POST(request: Request, { params }: CoverRedrawRouteProps) {
  try {
    const { id } = await params;
    const body = (await request.json()) as CoverRedrawRequest;

    if (body.confirmCost !== true) {
      return structuredError(
        "Cost confirmation is required.",
        ["Set confirmCost=true only after the user confirms the ChatGPT Image2 generation cost reminder."],
        400,
      );
    }

    const latestGeneration = await prisma.workTitleIntroGeneration.findFirst({
      where: { workId: id },
      orderBy: { createdAt: "desc" },
    });
    const titleText = resolveTitleText(body, latestGeneration?.titleVariantsJson ?? null);

    if (!titleText) {
      return structuredError("Title text is required.", ["请选择一个已生成的新书名，或手动输入标题。"], 400);
    }

    const result = await redrawCoverWithChatGPTImage2({
      workId: id,
      titleText,
      ratios: Array.isArray(body.ratios) ? body.ratios : ["1:1", "3:4"],
    });

    return NextResponse.json({
      success: true,
      data: {
        renders: result.renders.map(toCoverRedrawResponse),
        warnings: result.warnings,
      },
    });
  } catch (error) {
    return structuredError("Failed to redraw cover.", [errorMessage(error)], 500);
  }
}

function resolveTitleText(body: CoverRedrawRequest, titleVariantsJson: string | null): string {
  const manualTitle = body.titleText?.trim();

  if (manualTitle) {
    return manualTitle;
  }

  if (typeof body.titleSuggestionIndex !== "number") {
    return "";
  }

  const variants = titleOptionsFromGeneration(titleVariantsJson);

  return variants[body.titleSuggestionIndex]?.title ?? "";
}

function titleOptionsFromGeneration(value: string | null) {
  if (!value) {
    return [];
  }

  try {
    const variants = JSON.parse(value) as TitleVariantSuggestion[];

    return variants
      .filter((variant) => variant.title)
      .slice(0, 5)
      .map((variant, index) => ({
        index,
        title: variant.title,
        reason: variant.reason,
      }));
  } catch {
    return [];
  }
}

function toCoverRedrawResponse(render: ReturnType<typeof toCoverRenderView>) {
  return {
    id: render.id,
    ratio: render.outputRatio,
    status: render.status,
    previewUrl: render.status === "success" ? render.outputUrl : "",
    downloadUrl: render.status === "success" ? render.outputUrl : "",
    provider: render.provider,
    prompt: render.prompt,
    errorMessage: render.errorMessage,
    titleText: render.titleText,
    createdAt: render.createdAt,
  };
}

function normalizeStrategy(value: string): CoverStrategy {
  if (
    value === "keep_and_replace_title" ||
    value === "keep_and_optimize_layout" ||
    value === "redraw_cover"
  ) {
    return value;
  }

  return "keep_and_optimize_layout";
}

function structuredError(message: string, errors: string[], status: number) {
  return NextResponse.json({ success: false, message, errors }, { status });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error.";
}
