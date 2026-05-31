import type { CandidateWork, FinalMatch, SearchEvidence, SourceSummary } from "@/lib/adapters/search-adapter";

export type WorkRating = "S" | "A" | "B" | "C" | "D";

export type RenameSuggestion = "avoid" | "cautious" | "recommended" | "strongly_recommended";

export type RatingInput = {
  work: {
    id: string;
    title: string | null;
    author: string | null;
    importedTitle?: string | null;
    importedAuthor?: string | null;
    titleForMatching?: string | null;
    authorForMatching?: string | null;
    titleForEvaluation?: string | null;
    authorForEvaluation?: string | null;
    intro: string | null;
    category: string | null;
    contentType?: string | null;
    coverFileName: string | null;
    remark: string | null;
    notes?: string | null;
    playCount: number | null;
    clickRate: number | null;
    completionRate: number | null;
  };
  identification: {
    confidence: number | null;
    confirmed: boolean;
    finalMatch: FinalMatch | null;
    candidates: CandidateWork[];
    risks: string[];
    reason: string | null;
    evidence: SearchEvidence[];
    sourceSummary: SourceSummary | null;
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

export type RatingEvidenceWeight = {
  source: string;
  type: "platform" | "ip" | "social" | "ranking" | "sales" | "author" | "cover" | "test" | "manual" | "other";
  importance: "high" | "medium" | "low";
  effect: "increase" | "decrease" | "neutral";
  reason: string;
};

export type OpenAIRatingSourceTier =
  | "tier1_primary"
  | "tier2_trusted_distribution"
  | "tier3_audio_drama"
  | "tier4_social_ip"
  | "tier5_low_weight"
  | "tier0_filtered";

export type OpenAIRatingSourceCategory =
  | "primary_platform"
  | "third_party_reading"
  | "audio_platform"
  | "audio_drama_platform"
  | "social"
  | "news"
  | "encyclopedia"
  | "piracy"
  | "aggregator"
  | "irrelevant"
  | "other";

export type OpenAIRatingEvidenceType =
  | "platform_presence"
  | "ranking"
  | "sales"
  | "comments"
  | "subscription"
  | "author_profile"
  | "ip_adaptation"
  | "social_heat"
  | "audio_performance"
  | "publication"
  | "review"
  | "irrelevant"
  | "other";

export type OpenAISearchResultAnalysis = {
  resultId: string;
  sameWorkDecision: "matched" | "uncertain" | "rejected";
  sameWorkProbability: number;
  sourceTier: OpenAIRatingSourceTier;
  sourceCategory: OpenAIRatingSourceCategory;
  evidenceType: OpenAIRatingEvidenceType;
  claimStrength: "strong" | "medium" | "weak" | "none";
  canAffectRating: boolean;
  reason: string;
  extractedClaims: string[];
};

export type OpenAIAcceptedEvidence = {
  resultId: string;
  source: string;
  sourceTier: OpenAIRatingSourceTier;
  evidenceType: OpenAIRatingEvidenceType;
  claim: string;
  effect: "increase" | "decrease" | "neutral";
  importance: "high" | "medium" | "low";
  reason: string;
};

export type OpenAIMissingEvidence = {
  type: string;
  reason: string;
  shouldPenalize: false;
};

export type OpenAIEvidenceTags = {
  hasPrimaryPlatformEvidence: boolean;
  primaryPlatforms: string[];
  hasTrustedThirdPartyEvidence: boolean;
  trustedThirdPartyPlatforms: string[];
  hasAudioEvidence: boolean;
  audioPlatforms: string[];
  hasSocialHeatEvidence: boolean;
  socialHeatSources: string[];
  hasIpAdaptationEvidence: boolean;
  ipAdaptationTypes: string[];
  hasAuthorInfluenceEvidence: boolean;
  authorInfluenceSources: string[];
};

export type OpenAIRatingResultPayload = {
  rating: WorkRating;
  score: number;
  confidence: number;
  renameSuggestion: RenameSuggestion;
  reasonSummary: string;
  riskNotes: string[];
  keyEvidence: string[];
  evidenceWeighting: RatingEvidenceWeight[];
  missingEvidence: string[];
  operationAdvice: string;
  titleOptimizationPotential: "low" | "medium" | "high";
  coverOptimizationPotential: "low" | "medium" | "high";
  hasIpAdaptationEvidence: boolean;
  hasSocialHeatEvidence: boolean;
  hasAuthorInfluenceEvidence: boolean;
};

export type OpenAIRatingResult = {
  searchResultAnalysis: OpenAISearchResultAnalysis[];
  acceptedEvidence: OpenAIAcceptedEvidence[];
  uncertainEvidence: Array<{ resultId: string; reason: string }>;
  rejectedEvidence: Array<{ resultId: string; reason: string }>;
  missingEvidence: OpenAIMissingEvidence[];
  evidenceTags: OpenAIEvidenceTags;
  ratingResult: OpenAIRatingResultPayload;
};

export type RatingSupplementInput = {
  sourceType: string;
  title: string;
  content: string;
  evidenceUrl?: string | null;
  evidencePlatform?: string | null;
  importance: "high" | "medium" | "low";
};
