import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

export const runtime = "nodejs";

type ConfirmRouteProps = {
  params: Promise<{ id: string }>;
};

type ConfirmRequestBody = {
  identificationId?: string;
  confirmedTitle?: string;
  confirmedAuthor?: string;
};

export async function POST(request: Request, { params }: ConfirmRouteProps) {
  try {
    const { id } = await params;
    const body = await readJsonBody(request);

    if (!body.identificationId) {
      return NextResponse.json(
        {
          success: false,
          message: "identificationId 缺失",
          errors: ["请求体必须包含 identificationId"],
        },
        { status: 400 },
      );
    }

    const existing = await prisma.workIdentification.findFirst({
      where: {
        id: body.identificationId,
        workId: id,
      },
      select: {
        id: true,
        finalMatchJson: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message: "请先运行识别，再进行人工确认",
          errors: ["缺少识别结果"],
        },
        { status: 400 },
      );
    }

    const finalMatch = safeJsonParse<{ title?: string; author?: string } | null>(existing.finalMatchJson, null);
    const identification = await prisma.workIdentification.update({
      where: { id: existing.id },
      data: {
        confirmed: true,
        confirmedTitle: body.confirmedTitle?.trim() || finalMatch?.title || null,
        confirmedAuthor: body.confirmedAuthor?.trim() || finalMatch?.author || null,
      },
      select: {
        id: true,
        confidence: true,
        reason: true,
        confirmed: true,
        confirmedTitle: true,
        confirmedAuthor: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "历史人工确认信息已保存。正式匹配与评级仍以作品基础信息为准。",
      data: {
        identificationId: identification.id,
        confirmed: identification.confirmed,
        confirmedTitle: identification.confirmedTitle,
        confirmedAuthor: identification.confirmedAuthor,
        confidence: identification.confidence,
        reason: identification.reason,
        updatedAt: identification.updatedAt,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "人工确认失败",
        errors: [error instanceof Error ? error.message : "未知错误"],
      },
      { status: 500 },
    );
  }
}

async function readJsonBody(request: Request): Promise<ConfirmRequestBody> {
  try {
    const body = (await request.json()) as ConfirmRequestBody;
    return body && typeof body === "object" ? body : {};
  } catch {
    throw new Error("请求体 JSON 格式异常");
  }
}

function safeJsonParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
