import type { RatingResult } from "@/lib/rating/rating-types";
import { prisma } from "@/server/db";

export type SaveWorkRatingParams = {
  workId: string;
  identificationId?: string | null;
  result: RatingResult;
};

export async function saveWorkRating({ workId, identificationId, result }: SaveWorkRatingParams) {
  return prisma.workRating.create({
    data: {
      workId,
      identificationId: identificationId || null,
      rating: result.rating,
      score: result.score,
      confidence: result.confidence,
      reasonsJson: JSON.stringify(result.reasons),
      risksJson: JSON.stringify(result.risks),
      evidenceJson: JSON.stringify(result.evidence),
      renameSuggestion: result.renameSuggestion,
      renameReason: result.renameReason,
    },
  });
}
