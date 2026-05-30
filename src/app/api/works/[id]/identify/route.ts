import { NextResponse } from "next/server";
import { identifyWorkWithProviderMode, type SearchProviderMode } from "@/lib/adapters/search-adapter";
import { prisma } from "@/server/db";

export const runtime = "nodejs";

type IdentifyRouteProps = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: IdentifyRouteProps) {
  try {
    const body = await readOptionalJsonBody(request);
    const searchProviderMode: SearchProviderMode = body.searchProviderMode === "configured" ? "configured" : "mock";

    if (searchProviderMode === "configured" && body.costRiskAccepted !== true) {
      return NextResponse.json(
        {
          success: false,
          message: "请先确认真实搜索可能产生外部 API 费用。",
          errors: ["选择真实搜索识别时，必须勾选成本确认。"],
        },
        { status: 400 },
      );
    }

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

    const result = await identifyWorkWithProviderMode({
      title: work.title,
      author: work.author,
      intro: work.description,
      category: work.category,
      coverFileName: work.coverFileName,
      remark: work.notes,
      externalId: work.externalId,
    }, { searchProviderMode });
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
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json(
      {
        success: false,
        message: "作品识别失败",
        errors: [message],
      },
      { status: message === "请求体 JSON 格式异常。" ? 400 : 500 },
    );
  }
}

async function readOptionalJsonBody(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text();

  if (!text.trim()) {
    return {};
  }

  try {
    const value = JSON.parse(text) as unknown;
    return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  } catch {
    throw new Error("请求体 JSON 格式异常。");
  }
}
