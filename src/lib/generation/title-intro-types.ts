import type { CandidateWork, FinalMatch } from "@/lib/adapters/search-adapter";
import type { RatingResult, RenameSuggestion, WorkRating } from "@/lib/rating/rating-types";

export type GenerationStrategy = "keep_original" | "minor_optimization" | "rename_test" | "heavy_repackage";

export type TitleIntroGenerationInput = {
  work: {
    id: string;
    title: string | null;
    author: string | null;
    intro: string | null;
    category: string | null;
    coverFileName: string | null;
    remark: string | null;
    playCount: number | null;
    clickRate: number | null;
    completionRate: number | null;
  };
  identification: {
    confidence: number | null;
    finalMatch: FinalMatch | null;
    candidates: CandidateWork[];
    risks: string[];
    reason: string | null;
  } | null;
  rating: (RatingResult & {
    rating: WorkRating;
    renameSuggestion: RenameSuggestion;
  }) | null;
};

export type TitleVariantSuggestion = {
  title: string;
  sellingPoint: string;
  targetAudience: string;
  reason: string;
  risk: string;
  styleTag: string;
};

export type IntroVariantSuggestion = {
  intro: string;
  reason: string;
  styleTag: string;
  risk: string;
};

export type CoverPromptSuggestion = {
  ratio: "1:1" | "3:4";
  prompt: string;
  reason: string;
  risk: string;
};

export type TitleIntroGenerationResult = {
  shouldGenerateVariants: boolean;
  strategy: GenerationStrategy;
  strategyReason: string;
  titleVariants: TitleVariantSuggestion[];
  introVariant: IntroVariantSuggestion;
  coverPrompts: CoverPromptSuggestion[];
  risks: string[];
  evidence: string[];
};
