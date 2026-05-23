import { NextResponse } from "next/server";
import type { CandidateWork, FinalMatch } from "@/lib/adapters/search-adapter";
import { generateTitleIntroSuggestions } from "@/lib/generation/title-intro-engine";
import { getLatestTitleIntroGeneration, saveTitleIntroGeneration } from "@/lib/generation/title-intro-repository";
import type {
  CoverPromptSuggestion,
  IntroVariantSuggestion,
  TitleIntroGenerationInput,
  TitleVariantSuggestion,
} from "@/lib/generation/title-intro-types";
import type { RatingResult, RenameSuggestion, WorkRating } from "@/lib/rating/rating-types";
import { prisma } from "@/server/db";

export const runtime = "nodejs";

type TitleIntroRouteProps = {
  params: Promise<{ id: string }>;
};

type ParseResult<T> = {
  value: T;
  risks: string[];
};

export async function POST(request: Request, { params }: TitleIntroRouteProps) {
  try {
    const bodyParseError = await parseOptionalRequestJson(request);

    if (bodyParseError) {
      return NextResponse.json(
        {
          success: false,
          message: "请求体 JSON 格式异常",
          errors: [bodyParseError],
        },
        { status: 400 },
      );
    }

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
      return NextResponse.json(
        {
          success: false,
          message: "作品不存在",
          errors: ["未找到对应作品"],
        },
        { status: 404 },
      );
    }

    const latestIdentification = work.identifications[0] ?? null;
    const latestRating = work.ratings[0] ?? null;
    const identification = parseIdentification(latestIdentification);
    const rating = parseRating(latestRating);
    const input: TitleIntroGenerationInput = {
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
      identification: identification.value,
      rating: rating.value,
    };

    const result = generateTitleIntroSuggestions(input);
    const resultWithRisks = {
      ...result,
      risks: Array.from(new Set([...result.risks, ...identification.risks, ...rating.risks])),
    };
    const saved = await saveTitleIntroGeneration({
      workId: work.id,
      identificationId: latestIdentification?.id ?? null,
      ratingId: latestRating?.id ?? null,
      result: resultWithRisks,
    });

    return NextResponse.json({
      success: true,
      data: {
        generationId: saved.id,
        ...resultWithRisks,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "书名和简介优化生成失败",
        errors: [error instanceof Error ? error.message : "未知错误"],
      },
      { status: 500 },
    );
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
      risks.push("历史生成结果解析失败：titleVariantsJson"),
    );
    const introVariant = safeJsonParse<IntroVariantSuggestion>(
      generation.introVariantJson,
      {
        intro: "",
        reason: "",
        styleTag: "",
        risk: "历史生成结果解析失败",
      },
      () => risks.push("历史生成结果解析失败：introVariantJson"),
    );
    const coverPrompts = safeJsonParse<CoverPromptSuggestion[]>(generation.coverPromptsJson, [], () =>
      risks.push("历史生成结果解析失败：coverPromptsJson"),
    );
    const storedRisks = safeJsonParse<string[]>(generation.risksJson, [], () =>
      risks.push("历史生成结果解析失败：risksJson"),
    );
    const evidence = safeJsonParse<string[]>(generation.evidenceJson, [], () =>
      risks.push("历史生成结果解析失败：evidenceJson"),
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
    return NextResponse.json(
      {
        success: false,
        message: "读取书名和简介优化结果失败",
        errors: [error instanceof Error ? error.message : "未知错误"],
      },
      { status: 500 },
    );
  }
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
        risks: ["尚未进行作品识别"],
        reason: "",
      },
      risks: ["尚未进行作品识别"],
    };
  }

  const risks: string[] = [];
  const finalMatch = safeJsonParse<FinalMatch | null>(identification.finalMatchJson, null, () =>
    risks.push("WorkIdentification finalMatchJson 解析失败"),
  );
  const candidates = safeJsonParse<CandidateWork[]>(identification.candidatesJson, [], () =>
    risks.push("WorkIdentification candidatesJson 解析失败"),
  );
  const parsedRisks = safeJsonParse<string[]>(identification.risksJson, [], () =>
    risks.push("WorkIdentification risksJson 解析失败"),
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
        reasons: ["尚未进行作品评级，使用保守默认评级"],
        risks: ["缺少评级结果，生成建议置信度较低"],
        evidence: [],
        renameSuggestion: "cautious",
        renameReason: "缺少正式评级结果，仅生成保守优化建议",
      },
      risks: ["尚未进行作品评级，生成建议置信度较低"],
    };
  }

  const risks: string[] = [];
  const reasons = safeJsonParse<string[]>(rating.reasonsJson, [], () =>
    risks.push("WorkRating reasonsJson 解析失败"),
  );
  const parsedRisks = safeJsonParse<string[]>(rating.risksJson, [], () =>
    risks.push("WorkRating risksJson 解析失败"),
  );
  const evidence = safeJsonParse<string[]>(rating.evidenceJson, [], () =>
    risks.push("WorkRating evidenceJson 解析失败"),
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

async function parseOptionalRequestJson(request: Request): Promise<string | null> {
  const text = await request.text();

  if (!text.trim()) {
    return null;
  }

  try {
    JSON.parse(text);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "无法解析请求体 JSON";
  }
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
