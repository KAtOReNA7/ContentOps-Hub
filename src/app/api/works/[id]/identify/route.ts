import { NextResponse } from "next/server";
import { identifyWorkWithConfiguredProvider } from "@/lib/adapters/search-adapter";
import { prisma } from "@/server/db";

export const runtime = "nodejs";

type IdentifyRouteProps = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, { params }: IdentifyRouteProps) {
  try {
    const { id } = await params;
    const work = await prisma.work.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        author: true,
        description: true,
        coverFileName: true,
        category: true,
        externalId: true,
        notes: true,
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

    const result = await identifyWorkWithConfiguredProvider({
      title: work.title,
      author: work.author,
      intro: work.description,
      category: work.category,
      coverFileName: work.coverFileName,
      remark: work.notes,
      externalId: work.externalId,
    });
    const saved = await prisma.workIdentification.create({
      data: {
        workId: id,
        candidatesJson: JSON.stringify(result.candidates),
        finalMatchJson: JSON.stringify(result.finalMatch),
        confidence: result.confidence,
        reason: result.reason,
        risksJson: JSON.stringify(result.risks),
        searchProvider: result.searchProvider,
        searchQuery: result.searchQuery,
        searchResultsJson: JSON.stringify(result.searchResults),
        evidenceJson: JSON.stringify(result.evidence),
        riskHintsJson: JSON.stringify(result.riskHints),
        sourceSummaryJson: JSON.stringify(result.sourceSummary),
      },
      select: {
        id: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        identificationId: saved.id,
        candidates: result.candidates,
        finalMatch: result.finalMatch,
        confidence: result.confidence,
        reason: result.reason,
        risks: result.risks,
        searchProvider: result.searchProvider,
        searchQuery: result.searchQuery,
        searchResults: result.searchResults,
        evidence: result.evidence,
        riskHints: result.riskHints,
        sourceSummary: result.sourceSummary,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "作品识别失败",
        errors: [error instanceof Error ? error.message : "未知错误"],
      },
      { status: 500 },
    );
  }
}
