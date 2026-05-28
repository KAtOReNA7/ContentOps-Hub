import { NextResponse } from "next/server";

import type { CandidateWork, FinalMatch } from "@/lib/adapters/search-adapter";
import {
  OpenAITitleIntroRequestError,
  OpenAITitleIntroTimeoutError,
  generateTitleIntroWithOpenAI,
} from "@/lib/generation/llm/openai-title-intro-adapter";
import { generateTitleIntroSuggestions } from "@/lib/generation/title-intro-engine";
import { getLatestTitleIntroGeneration, saveTitleIntroGeneration } from "@/lib/generation/title-intro-repository";
import type {
  CoverPromptSuggestion,
  IntroVariantSuggestion,
  TitleIntroGenerationInput,
  TitleIntroGenerationResult,
  TitleVariantSuggestion,
} from "@/lib/generation/title-intro-types";
import type { RatingResult, RenameSuggestion, WorkRating } from "@/lib/rating/rating-types";
import { prisma } from "@/server/db";

export const runtime = "nodejs";

type TitleIntroRouteProps = {
  params: Promise<{ id: string }>;
};

type GenerationProvider = "mock" | "openai";

type ParseResult<T> = {
  value: T;
  risks: string[];
};

type ProviderParseResult =
  | {
      provider: GenerationProvider;
      error: null;
    }
  | {
      provider: null;
      error: {
        status: number;
        message: string;
        errors: string[];
      };
    };

export async function POST(request: Request, { params }: TitleIntroRouteProps) {
  try {
    const providerParse = await parseGenerationProvider(request);

    if (providerParse.error) {
      return structuredError(providerParse.error.message, providerParse.error.errors, providerParse.error.status);
    }

    const provider = providerParse.provider;
    const { id } = await params;
    const work = await prisma.work.findUnique({
      where: { id },
      include: {
        identifications: {
          orderBy: { updatedAt: "desc" },
          take: 1,
        },
        ratings: {
          orderBy: { updatedAt: "desc" },
          take: 1,
        },
      },
    });

    if (!work) {
      return structuredError("Work not found.", ["No work exists for the provided id."], 404);
    }

    const latestIdentification = work.identifications[0] ?? null;
    const latestRating = work.ratings[0] ?? null;
    const identification = parseIdentification(latestIdentification);
    const rating = parseRating(latestRating);
    const input = buildGenerationInput(work, identification.value, rating.value);
    const result = await runGenerationProvider(provider, input);
    const resultWithContext = appendGenerationContext(result, provider, identification.risks, rating.risks);
    const saved = await saveTitleIntroGeneration({
      workId: work.id,
      identificationId: latestIdentification?.id ?? null,
      ratingId: latestRating?.id ?? null,
      result: resultWithContext,
    });

    return NextResponse.json({
      success: true,
      data: {
        generationId: saved.id,
        provider,
        ...resultWithContext,
      },
    });
  } catch (error) {
    const mappedError = mapGenerationError(error);

    return structuredError(mappedError.message, mappedError.errors, mappedError.status);
  }
}

export async function GET(_request: Request, { params }: TitleIntroRouteProps) {
  try {
    const { id } = await params;
    const generation = await getLatestTitleIntroGeneration(id);

    if (!generation) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    const risks: string[] = [];
    const titleVariants = safeJsonParse<TitleVariantSuggestion[]>(generation.titleVariantsJson, [], () =>
      risks.push("Failed to parse titleVariantsJson from stored generation."),
    );
    const introVariant = safeJsonParse<IntroVariantSuggestion>(
      generation.introVariantJson,
      {
        intro: "",
        reason: "",
        styleTag: "",
        risk: "Failed to parse stored intro variant.",
      },
      () => risks.push("Failed to parse introVariantJson from stored generation."),
    );
    const coverPrompts = safeJsonParse<CoverPromptSuggestion[]>(generation.coverPromptsJson, [], () =>
      risks.push("Failed to parse coverPromptsJson from stored generation."),
    );
    const storedRisks = safeJsonParse<string[]>(generation.risksJson, [], () =>
      risks.push("Failed to parse risksJson from stored generation."),
    );
    const evidence = safeJsonParse<string[]>(generation.evidenceJson, [], () =>
      risks.push("Failed to parse evidenceJson from stored generation."),
    );

    return NextResponse.json({
      success: true,
      data: {
        generationId: generation.id,
        shouldGenerateVariants: generation.shouldGenerateVariants,
        strategy: generation.strategy,
        strategyReason: generation.strategyReason,
        titleVariants,
        introVariant,
        coverPrompts,
        risks: Array.from(new Set([...storedRisks, ...risks])),
        evidence,
      },
    });
  } catch (error) {
    return structuredError(
      "Failed to read title and intro generation result.",
      [error instanceof Error ? error.message : "Unknown error."],
      500,
    );
  }
}

async function parseGenerationProvider(request: Request): Promise<ProviderParseResult> {
  const text = await request.text();

  if (!text.trim()) {
    return { provider: "mock", error: null };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return {
      provider: null,
      error: {
        status: 400,
        message: "Request body must be valid JSON.",
        errors: [error instanceof Error ? error.message : "Unable to parse request JSON."],
      },
    };
  }

  if (!isRecord(parsed)) {
    return {
      provider: null,
      error: {
        status: 400,
        message: "Request body must be a JSON object.",
        errors: ["Expected an object with an optional provider field."],
      },
    };
  }

  const provider = parsed.provider;

  if (provider === undefined || provider === null || provider === "") {
    return { provider: "mock", error: null };
  }

  if (provider === "mock" || provider === "openai") {
    return { provider, error: null };
  }

  return {
    provider: null,
    error: {
      status: 400,
      message: "Invalid generation provider.",
      errors: ["provider must be one of: mock, openai."],
    },
  };
}

function buildGenerationInput(
  work: {
    id: string;
    title: string;
    author: string | null;
    description: string | null;
    category: string | null;
    coverFileName: string | null;
    notes: string | null;
    currentPlays: number | null;
    currentCtr: number | null;
    currentFinish: number | null;
  },
  identification: NonNullable<TitleIntroGenerationInput["identification"]>,
  rating: RatingResult,
): TitleIntroGenerationInput {
  return {
    work: {
      id: work.id,
      title: work.title || "",
      author: work.author || "",
      intro: work.description || "",
      category: work.category || "",
      coverFileName: work.coverFileName || "",
      remark: work.notes || "",
      playCount: work.currentPlays ?? null,
      clickRate: work.currentCtr ?? null,
      completionRate: work.currentFinish ?? null,
    },
    identification,
    rating,
  };
}

async function runGenerationProvider(
  provider: GenerationProvider,
  input: TitleIntroGenerationInput,
): Promise<TitleIntroGenerationResult> {
  if (provider === "mock") {
    return generateTitleIntroSuggestions(input);
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required when provider is openai.");
  }

  if (!process.env.OPENAI_TEXT_MODEL) {
    throw new Error("OPENAI_TEXT_MODEL is required when provider is openai.");
  }

  return generateTitleIntroWithOpenAI(input);
}

function appendGenerationContext(
  result: TitleIntroGenerationResult,
  provider: GenerationProvider,
  identificationRisks: string[],
  ratingRisks: string[],
): TitleIntroGenerationResult {
  const providerEvidence =
    provider === "openai"
      ? ["Generation provider: OpenAI", `Model: ${process.env.OPENAI_TEXT_MODEL}`]
      : ["Generation provider: Mock rule engine"];

  return {
    ...result,
    risks: Array.from(new Set([...result.risks, ...identificationRisks, ...ratingRisks])),
    evidence: Array.from(new Set([...result.evidence, ...providerEvidence])),
  };
}

function parseIdentification(
  identification:
    | {
        confidence: number;
        finalMatchJson: string;
        candidatesJson: string;
        risksJson: string;
        reason: string;
      }
    | null,
): ParseResult<NonNullable<TitleIntroGenerationInput["identification"]>> {
  if (!identification) {
    return {
      value: {
        confidence: 0,
        finalMatch: null,
        candidates: [],
        risks: ["Work has not been identified yet."],
        reason: "",
      },
      risks: ["Work has not been identified yet."],
    };
  }

  const risks: string[] = [];
  const finalMatch = safeJsonParse<FinalMatch | null>(identification.finalMatchJson, null, () =>
    risks.push("Failed to parse WorkIdentification finalMatchJson."),
  );
  const candidates = safeJsonParse<CandidateWork[]>(identification.candidatesJson, [], () =>
    risks.push("Failed to parse WorkIdentification candidatesJson."),
  );
  const parsedRisks = safeJsonParse<string[]>(identification.risksJson, [], () =>
    risks.push("Failed to parse WorkIdentification risksJson."),
  );

  return {
    value: {
      confidence: identification.confidence,
      finalMatch,
      candidates,
      risks: [...parsedRisks, ...risks],
      reason: identification.reason || "",
    },
    risks,
  };
}

function parseRating(
  rating:
    | {
        rating: string;
        score: number;
        confidence: number;
        reasonsJson: string;
        risksJson: string;
        evidenceJson: string;
        renameSuggestion: string;
        renameReason: string;
      }
    | null,
): ParseResult<RatingResult> {
  if (!rating) {
    return {
      value: {
        rating: "C",
        score: 50,
        confidence: 0.3,
        reasons: ["No work rating exists yet. Conservative default rating is used."],
        risks: ["Missing rating result. Generation confidence is lower."],
        evidence: [],
        renameSuggestion: "cautious",
        renameReason: "No formal rating result exists. Only conservative optimization suggestions are generated.",
      },
      risks: ["Work has not been rated yet. Generation confidence is lower."],
    };
  }

  const risks: string[] = [];
  const reasons = safeJsonParse<string[]>(rating.reasonsJson, [], () =>
    risks.push("Failed to parse WorkRating reasonsJson."),
  );
  const parsedRisks = safeJsonParse<string[]>(rating.risksJson, [], () =>
    risks.push("Failed to parse WorkRating risksJson."),
  );
  const evidence = safeJsonParse<string[]>(rating.evidenceJson, [], () =>
    risks.push("Failed to parse WorkRating evidenceJson."),
  );

  return {
    value: {
      rating: normalizeRating(rating.rating),
      score: rating.score,
      confidence: rating.confidence,
      reasons,
      risks: [...parsedRisks, ...risks],
      evidence,
      renameSuggestion: normalizeRenameSuggestion(rating.renameSuggestion),
      renameReason: rating.renameReason || "",
    },
    risks,
  };
}

function normalizeRating(value: string): WorkRating {
  return value === "S" || value === "A" || value === "B" || value === "C" || value === "D" ? value : "C";
}

function normalizeRenameSuggestion(value: string): RenameSuggestion {
  if (
    value === "avoid" ||
    value === "cautious" ||
    value === "recommended" ||
    value === "strongly_recommended"
  ) {
    return value;
  }

  return "cautious";
}

function safeJsonParse<T>(value: string, fallback: T, onError?: () => void): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    onError?.();
    return fallback;
  }
}

function structuredError(message: string, errors: string[], status: number) {
  return NextResponse.json(
    {
      success: false,
      message,
      errors,
    },
    { status },
  );
}

function mapGenerationError(error: unknown): { message: string; errors: string[]; status: number } {
  if (error instanceof OpenAITitleIntroTimeoutError) {
    return {
      message: "OpenAI request timed out.",
      errors: [
        `OpenAI request timed out after ${error.timeoutMs} ms.`,
        `usingBaseURL: ${error.usingBaseURL}`,
        `baseURLHost: ${error.baseURLHost ?? "none"}`,
        `usingProxy: ${error.usingProxy}`,
        `proxyProtocol: ${error.proxyProtocol ?? "none"}`,
        "建议检查 OPENAI_BASE_URL、OPENAI_PROXY_URL、网络、代理、模型延迟，或换用更快模型。",
      ],
      status: 504,
    };
  }

  if (error instanceof OpenAITitleIntroRequestError) {
    const status = error.status;
    const mappedStatus = status === 401 || status === 403 || status === 404 ? 400 : typeof status === "number" ? 502 : 500;

    return {
      message:
        mappedStatus === 400
          ? "OpenAI model or account permission is unavailable."
          : "Failed to generate title and intro suggestions.",
      errors: [
        `errorName: ${error.errorName}`,
        `errorMessage: ${error.message}`,
        `timeoutMs: ${error.timeoutMs}`,
        `usingBaseURL: ${error.usingBaseURL}`,
        `baseURLHost: ${error.baseURLHost ?? "none"}`,
        `usingProxy: ${error.usingProxy}`,
        `proxyProtocol: ${error.proxyProtocol ?? "none"}`,
        `model: ${error.model}`,
        error.status === null ? "" : `status: ${error.status}`,
        error.code ? `code: ${error.code}` : "",
        error.causeName ? `causeName: ${error.causeName}` : "",
        error.causeCode ? `causeCode: ${error.causeCode}` : "",
        error.causeMessage ? `causeMessage: ${error.causeMessage}` : "",
        "hint: 确认 npm run dev 已重启，并检查 OPENAI_BASE_URL / OPENAI_PROXY_URL 是否与 test:openai-text 使用一致。",
      ].filter(Boolean),
      status: mappedStatus,
    };
  }

  const message = error instanceof Error ? error.message : "Unknown error.";

  if (message.includes("OPENAI_API_KEY") || message.includes("OPENAI_TEXT_MODEL") || message.includes("OPENAI_BASE_URL")) {
    const baseURLDiagnostics = getBaseURLDiagnostics();

    return {
      message: "OpenAI configuration is missing.",
      errors: [
        message,
        `usingBaseURL: ${baseURLDiagnostics.usingBaseURL}`,
        `baseURLHost: ${baseURLDiagnostics.baseURLHost ?? "none"}`,
      ],
      status: 400,
    };
  }

  const status = getErrorStatus(error);
  const code = getErrorCode(error);

  if (status === 401 || status === 403 || status === 404) {
    return {
      message: "OpenAI model or account permission is unavailable.",
      errors: [message, `status: ${status}`, code ? `code: ${code}` : ""].filter(Boolean),
      status: 400,
    };
  }

  if (typeof status === "number" && status >= 400) {
    return {
      message: "OpenAI request failed.",
      errors: [message, `status: ${status}`, code ? `code: ${code}` : ""].filter(Boolean),
      status: 502,
    };
  }

  return {
    message: "Failed to generate title and intro suggestions.",
    errors: [message],
    status: 500,
  };
}

function getErrorStatus(error: unknown): number | null {
  if (typeof error === "object" && error !== null && "status" in error && typeof error.status === "number") {
    return error.status;
  }

  return null;
}

function getErrorCode(error: unknown): string | null {
  if (typeof error === "object" && error !== null && "code" in error) {
    return String(error.code);
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getBaseURLDiagnostics(): { usingBaseURL: boolean; baseURLHost: string | null } {
  const baseURL = process.env.OPENAI_BASE_URL;

  if (!baseURL) {
    return {
      usingBaseURL: false,
      baseURLHost: null,
    };
  }

  try {
    return {
      usingBaseURL: true,
      baseURLHost: new URL(baseURL).host,
    };
  } catch {
    return {
      usingBaseURL: true,
      baseURLHost: "invalid",
    };
  }
}
