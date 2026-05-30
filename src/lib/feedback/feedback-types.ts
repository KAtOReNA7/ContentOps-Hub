export type ActualOutcome = "positive" | "neutral" | "negative" | "inconclusive";
export type RatingAccuracy = "overestimated" | "underestimated" | "accurate" | "unknown";
export type StrategyEffect = "effective" | "ineffective" | "mixed" | "unknown";
export type KeyLiftMetric = "ctr" | "conversion" | "finish_rate" | "revenue" | "mixed" | "none";

export type FeedbackInsightView = {
  id: string;
  experimentReviewId: string;
  originalRating: string | null;
  originalScore: number | null;
  originalRenameSuggestion: string | null;
  originalCoverStrategy: string | null;
  finalRecommendation: string | null;
  actualOutcome: string;
  ratingAccuracy: string;
  titleStrategyEffect: string;
  coverStrategyEffect: string;
  keyLiftMetric: string;
  summary: string;
  liftSummary: Record<string, number | null>;
  evidence: string[];
  riskNotes: string[];
  strategyTags: string[];
  createdAt: string;
};
