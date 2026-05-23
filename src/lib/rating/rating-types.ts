import type { CandidateWork, FinalMatch } from "@/lib/adapters/search-adapter";

export type WorkRating = "S" | "A" | "B" | "C" | "D";

export type RenameSuggestion = "avoid" | "cautious" | "recommended" | "strongly_recommended";

export type RatingInput = {
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
};

export type RatingResult = {
  rating: WorkRating;
  score: number;
  confidence: number;
  reasons: string[];
  risks: string[];
  evidence: string[];
  renameSuggestion: RenameSuggestion;
  renameReason: string;
};
