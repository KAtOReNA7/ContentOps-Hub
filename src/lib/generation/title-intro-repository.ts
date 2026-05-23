import { prisma } from "@/server/db";
import type { TitleIntroGenerationResult } from "@/lib/generation/title-intro-types";

export type SaveTitleIntroGenerationParams = {
  workId: string;
  identificationId?: string | null;
  ratingId?: string | null;
  result: TitleIntroGenerationResult;
};

export async function saveTitleIntroGeneration({
  workId,
  identificationId,
  ratingId,
  result,
}: SaveTitleIntroGenerationParams) {
  return prisma.workTitleIntroGeneration.create({
    data: {
      workId,
      identificationId: identificationId || null,
      ratingId: ratingId || null,
      shouldGenerateVariants: result.shouldGenerateVariants,
      strategy: result.strategy,
      strategyReason: result.strategyReason,
      titleVariantsJson: JSON.stringify(result.titleVariants),
      introVariantJson: JSON.stringify(result.introVariant),
      coverPromptsJson: JSON.stringify(result.coverPrompts),
      risksJson: JSON.stringify(result.risks),
      evidenceJson: JSON.stringify(result.evidence),
    },
  });
}

export async function getLatestTitleIntroGeneration(workId: string) {
  return prisma.workTitleIntroGeneration.findFirst({
    where: { workId },
    orderBy: { createdAt: "desc" },
  });
}
