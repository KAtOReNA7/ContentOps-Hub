import { NextResponse } from "next/server";
import { applyCandidateRelevanceGate, type CandidateWork, type FinalMatch, type SearchEvidence, type SourceSummary } from "@/lib/adapters/search-adapter";
import { evaluateWorkRating } from "@/lib/rating/rating-engine";
import type { RatingInput, RatingResult } from "@/lib/rating/rating-types";
import { saveWorkRating } from "@/lib/rating/rating-repository";
import { prisma } from "@/server/db";

export const runtime = "nodejs";

type RatingRouteProps = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, { params }: RatingRouteProps) {
  try {
    const { id } = await params;
    const work = await prisma.work.findUnique({
      where: { id },
      include: {
        identifications: {
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

    const { identification, parseRisks } = parseLatestIdentification(work, work.identifications[0] ?? null);
    const result = evaluateWorkRating({
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
    });
    const resultWithParseRisks: RatingResult = parseRisks.length
      ? {
          ...result,
          risks: Array.from(new Set([...result.risks, ...parseRisks])),
          evidence: [...result.evidence, "识别结果 JSON 解析存在异常，已降级处理"],
        }
      : result;
    const saved = await saveWorkRating({
      workId: work.id,
      identificationId: work.identifications[0]?.id ?? null,
      result: resultWithParseRisks,
    });

    return NextResponse.json({
      success: true,
      data: toRatingResponse(saved.id, resultWithParseRisks),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "作品评级失败",
        errors: [error instanceof Error ? error.message : "未知错误"],
      },
      { status: 500 },
    );
  }
}

export async function GET(_request: Request, { params }: RatingRouteProps) {
  try {
    const { id } = await params;
    const rating = await prisma.workRating.findFirst({
      where: { workId: id },
      orderBy: { updatedAt: "desc" },
    });

    if (!rating) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        ratingId: rating.id,
        rating: rating.rating,
        score: rating.score,
        confidence: rating.confidence,
        reasons: safeJsonParse<string[]>(rating.reasonsJson, []),
        risks: safeJsonParse<string[]>(rating.risksJson, []),
        evidence: safeJsonParse<string[]>(rating.evidenceJson, []),
        renameSuggestion: rating.renameSuggestion,
        renameReason: rating.renameReason,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "读取评级结果失败",
        errors: [error instanceof Error ? error.message : "未知错误"],
      },
      { status: 500 },
    );
  }
}

function parseLatestIdentification(
  work: {
    title: string;
    author: string | null;
    description: string;
    category: string | null;
    coverFileName: string | null;
    notes: string | null;
    externalId: string | null;
  },
  identification:
    | {
        confidence: number;
        confirmed: boolean;
        confirmedTitle: string | null;
        confirmedAuthor: string | null;
        finalMatchJson: string;
        candidatesJson: string;
        risksJson: string;
        reason: string;
        evidenceJson: string;
        sourceSummaryJson: string;
      }
    | null,
): { identification: RatingInput["identification"]; parseRisks: string[] } {
  if (!identification) {
    return {
      identification: {
        confidence: null,
        confirmed: false,
        finalMatch: null,
        candidates: [],
        risks: ["尚未进行作品识别，评级置信度较低"],
        reason: null,
        evidence: [],
        sourceSummary: null,
      },
      parseRisks: [],
    };
  }

  const parseRisks: string[] = [];
  const finalMatch = safeJsonParse<FinalMatch | null>(identification.finalMatchJson, null, () =>
    parseRisks.push("finalMatchJson 解析失败"),
  );
  const candidates = safeJsonParse<CandidateWork[]>(identification.candidatesJson, [], () =>
    parseRisks.push("candidatesJson 解析失败"),
  );
  const risks = safeJsonParse<string[]>(identification.risksJson, [], () =>
    parseRisks.push("risksJson 解析失败"),
  );
  const evidence = safeJsonParse<SearchEvidence[]>(identification.evidenceJson, [], () =>
    parseRisks.push("evidenceJson 解析失败"),
  );
  const sourceSummary = safeJsonParse<SourceSummary | null>(identification.sourceSummaryJson, null, () =>
    parseRisks.push("sourceSummaryJson 解析失败"),
  );
  const canonicalTitle = identification.confirmedTitle || finalMatch?.title || work.title;
  const canonicalAuthor = identification.confirmedAuthor || finalMatch?.author || work.author;
  const gated = applyCandidateRelevanceGate(
    {
      title: canonicalTitle,
      author: canonicalAuthor,
      intro: work.description,
      category: work.category,
      coverFileName: work.coverFileName,
      remark: work.notes,
      externalId: work.externalId,
    },
    candidates,
    sourceSummary,
  );

  return {
    identification: {
      confidence: identification.confidence,
      confirmed: identification.confirmed,
      finalMatch,
      candidates: gated.candidates,
      risks,
      reason: identification.reason,
      evidence,
      sourceSummary: gated.sourceSummary,
    },
    parseRisks,
  };
}

function toRatingResponse(ratingId: string, result: RatingResult) {
  return {
    ratingId,
    rating: result.rating,
    score: result.score,
    confidence: result.confidence,
    reasons: result.reasons,
    risks: result.risks,
    evidence: result.evidence,
    renameSuggestion: result.renameSuggestion,
    renameReason: result.renameReason,
  };
}

function safeJsonParse<T>(value: string, fallback: T, onError?: () => void): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    onError?.();
    return fallback;
  }
}
