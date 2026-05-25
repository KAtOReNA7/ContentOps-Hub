import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { WorkCoverEvaluation, WorkRating } from "@prisma/client";
import type { CoverRenderRatio, CoverRenderView } from "@/lib/cover-render/cover-render-types";
import { saveCoverRender, toCoverRenderView } from "@/lib/cover-render/cover-render-repository";
import type { CoverStrategy } from "@/lib/cover/cover-types";
import type { IntroVariantSuggestion, TitleVariantSuggestion } from "@/lib/generation/title-intro-types";
import { buildCoverRedrawPrompt } from "@/lib/image-generation/cover-redraw-prompt";
import { createImageGenerationAdapter } from "@/lib/image-generation/image-generation-adapter";
import type { CoverRedrawWarning } from "@/lib/image-generation/image-generation-types";
import { prisma } from "@/server/db";

export type RedrawCoverParams = {
  workId: string;
  titleText: string;
  ratios: CoverRenderRatio[];
};

export type RedrawCoverResult = {
  renders: CoverRenderView[];
  warnings: CoverRedrawWarning[];
};

export async function redrawCoverWithChatGPTImage2(params: RedrawCoverParams): Promise<RedrawCoverResult> {
  const titleText = params.titleText.trim();

  if (!titleText) {
    throw new Error("titleText is required.");
  }

  const work = await prisma.work.findUnique({
    where: { id: params.workId },
    include: {
      coverAssets: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      coverEvaluations: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      ratings: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      titleIntroGenerations: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!work) {
    throw new Error("Work not found.");
  }

  const latestEvaluation = work.coverEvaluations[0] ?? null;
  const latestGeneration = work.titleIntroGenerations[0] ?? null;
  const latestRating = work.ratings[0] ?? null;
  const latestAsset = work.coverAssets[0] ?? null;
  const warnings = buildWarnings(latestEvaluation);
  const titleVariants = safeJsonParse<TitleVariantSuggestion[]>(latestGeneration?.titleVariantsJson, []);
  const introVariant = safeJsonParse<IntroVariantSuggestion | null>(latestGeneration?.introVariantJson, null);
  const adapter = createImageGenerationAdapter();
  const renders: CoverRenderView[] = [];

  for (const ratio of uniqueRatios(params.ratios)) {
    const prompt = buildCoverRedrawPrompt({
      ratio,
      titleText,
      work: {
        title: work.title,
        author: work.author,
        description: work.description,
        category: work.category,
      },
      rating: latestRating ? toRatingPromptContext(latestRating) : null,
      titleVariants,
      introVariant,
      coverEvaluation: latestEvaluation ? toEvaluationPromptContext(latestEvaluation) : null,
    });

    try {
      const image = await adapter.generateCoverImage({
        prompt,
        ratio,
        titleText,
      });
      const storagePath = path.join("uploads", "cover-redraws", params.workId, `${randomUUID()}-${ratio.replace(":", "x")}.png`);
      const outputPath = path.join(process.cwd(), storagePath);

      await mkdir(path.dirname(outputPath), { recursive: true });
      await writeFile(outputPath, image.imageBytes);

      const saved = await saveCoverRender({
        workId: work.id,
        coverAssetId: latestAsset?.id ?? null,
        titleIntroGenerationId: latestGeneration?.id ?? null,
        titleText,
        strategy: "redraw_cover",
        outputRatio: ratio,
        prompt,
        provider: "chatgpt_image2",
        outputPath: storagePath,
        status: "success",
      });

      renders.push(toCoverRenderView(saved));
    } catch (error) {
      const saved = await saveCoverRender({
        workId: work.id,
        coverAssetId: latestAsset?.id ?? null,
        titleIntroGenerationId: latestGeneration?.id ?? null,
        titleText,
        strategy: "redraw_cover",
        outputRatio: ratio,
        prompt,
        provider: "chatgpt_image2",
        outputPath: null,
        status: "failed",
        errorMessage: formatImageGenerationError(error),
      });

      renders.push(toCoverRenderView(saved));
    }
  }

  return {
    renders,
    warnings,
  };
}

function buildWarnings(evaluation: WorkCoverEvaluation | null): CoverRedrawWarning[] {
  if (!evaluation) {
    return [
      {
        code: "missing_cover_evaluation",
        message: "当前作品没有封面评估结果，已按保守信息生成重绘 prompt。",
      },
    ];
  }

  const effectiveStrategy = normalizeStrategy(evaluation.confirmedStrategy || evaluation.strategy);

  if (effectiveStrategy !== "redraw_cover") {
    return [
      {
        code: "strategy_not_redraw_cover",
        message: "当前封面策略不是 redraw_cover，本次仍按用户确认执行重绘。",
      },
    ];
  }

  return [];
}

function toRatingPromptContext(rating: WorkRating) {
  return {
    rating: rating.rating,
    score: rating.score,
    renameSuggestion: rating.renameSuggestion,
    renameReason: rating.renameReason,
  };
}

function toEvaluationPromptContext(evaluation: WorkCoverEvaluation) {
  return {
    strategy: normalizeStrategy(evaluation.confirmedStrategy || evaluation.strategy),
    reason: evaluation.reason,
    weaknesses: safeJsonParse<string[]>(evaluation.weaknessesJson, []),
  };
}

function uniqueRatios(ratios: CoverRenderRatio[]): CoverRenderRatio[] {
  const filtered = ratios.filter((ratio): ratio is CoverRenderRatio => ratio === "1:1" || ratio === "3:4");
  const unique = Array.from(new Set(filtered));

  return unique.length ? unique : ["1:1", "3:4"];
}

function normalizeStrategy(value: string): CoverStrategy {
  if (
    value === "keep_and_replace_title" ||
    value === "keep_and_optimize_layout" ||
    value === "redraw_cover"
  ) {
    return value;
  }

  return "redraw_cover";
}

function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function formatImageGenerationError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Unknown image generation error.";
  }

  const details = error instanceof Error && "diagnostics" in error ? error.diagnostics : null;

  if (!details || typeof details !== "object") {
    return error.message;
  }

  const diagnostics = details as Record<string, unknown>;

  return [
    error.message,
    `model: ${String(diagnostics.model ?? "")}`,
    `timeoutMs: ${String(diagnostics.timeoutMs ?? "")}`,
    `usingProxy: ${String(diagnostics.usingProxy ?? "")}`,
    `proxyProtocol: ${String(diagnostics.proxyProtocol ?? "none")}`,
    diagnostics.status === null || diagnostics.status === undefined ? "" : `status: ${String(diagnostics.status)}`,
    diagnostics.code ? `code: ${String(diagnostics.code)}` : "",
    diagnostics.causeName ? `causeName: ${String(diagnostics.causeName)}` : "",
    diagnostics.causeCode ? `causeCode: ${String(diagnostics.causeCode)}` : "",
    diagnostics.causeMessage ? `causeMessage: ${String(diagnostics.causeMessage)}` : "",
  ]
    .filter(Boolean)
    .join(" | ");
}
