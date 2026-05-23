import { NextResponse } from "next/server";
import { identifyWorkWithMock } from "@/lib/adapters/search-adapter";
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

    const result = identifyWorkWithMock({
      title: work.title,
      author: work.author,
      intro: work.description,
      category: work.category,
      coverFileName: work.coverFileName,
      remark: work.notes,
    });
    const saved = await prisma.workIdentification.create({
      data: {
        workId: id,
        candidatesJson: JSON.stringify(result.candidates),
        finalMatchJson: JSON.stringify(result.finalMatch),
        confidence: result.confidence,
        reason: result.reason,
        risksJson: JSON.stringify(result.risks),
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
