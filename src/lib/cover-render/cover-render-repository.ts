import type { WorkCoverRender } from "@prisma/client";
import type { CoverRenderRatio, CoverRenderStatus, CoverRenderView } from "@/lib/cover-render/cover-render-types";
import type { CoverStrategy } from "@/lib/cover/cover-types";
import { prisma } from "@/server/db";

export type SaveCoverRenderParams = {
  workId: string;
  coverAssetId: string;
  titleIntroGenerationId?: string | null;
  titleText: string;
  strategy: CoverStrategy;
  outputRatio: CoverRenderRatio;
  outputPath: string;
  status?: CoverRenderStatus;
  errorMessage?: string | null;
};

export async function saveCoverRender(params: SaveCoverRenderParams) {
  return prisma.workCoverRender.create({
    data: {
      workId: params.workId,
      coverAssetId: params.coverAssetId,
      titleIntroGenerationId: params.titleIntroGenerationId || null,
      titleText: params.titleText,
      strategy: params.strategy,
      outputRatio: params.outputRatio,
      outputPath: params.outputPath,
      outputUrl: null,
      status: params.status ?? "success",
      errorMessage: params.errorMessage ?? null,
    },
  });
}

export async function getLatestCoverRenders(workId: string) {
  return prisma.workCoverRender.findMany({
    where: { workId },
    orderBy: { createdAt: "desc" },
    take: 6,
  });
}

export function toCoverRenderView(render: WorkCoverRender): CoverRenderView {
  return {
    id: render.id,
    coverAssetId: render.coverAssetId,
    titleIntroGenerationId: render.titleIntroGenerationId,
    titleText: render.titleText,
    strategy: normalizeRenderStrategy(render.strategy),
    outputRatio: normalizeRatio(render.outputRatio),
    outputUrl: `/api/cover-renders/${render.id}/file`,
    status: render.status === "failed" ? "failed" : "success",
    errorMessage: render.errorMessage,
    createdAt: render.createdAt.toISOString(),
  };
}

function normalizeRatio(value: string): CoverRenderRatio {
  return value === "1:1" ? "1:1" : "3:4";
}

function normalizeRenderStrategy(value: string): CoverStrategy {
  if (value === "keep_and_replace_title" || value === "keep_and_optimize_layout" || value === "redraw_cover") {
    return value;
  }

  return "keep_and_optimize_layout";
}
