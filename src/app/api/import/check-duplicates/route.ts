import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { titleAuthorKey, type RawImportRow } from "@/lib/import/validation";

export const runtime = "nodejs";

type CheckDuplicatesRequest = {
  rows: RawImportRow[];
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CheckDuplicatesRequest;
    const rows = Array.isArray(body.rows) ? body.rows : [];
    const externalIds = rows
      .map((row) => String(row["作品ID"] ?? "").trim())
      .filter(Boolean);

    const existingByExternalId = externalIds.length
      ? await prisma.work.findMany({
          where: {
            externalId: {
              in: externalIds,
            },
          },
          select: {
            externalId: true,
          },
        })
      : [];

    const existingWorks = await prisma.work.findMany({
      select: {
        title: true,
        author: true,
      },
    });

    return NextResponse.json({
      success: true,
      externalIds: existingByExternalId.map((work) => work.externalId).filter(Boolean),
      titleAuthorKeys: existingWorks
        .filter((work) => work.author)
        .map((work) => titleAuthorKey(work.title, work.author ?? "")),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "重复作品检查失败",
        errors: [error instanceof Error ? error.message : "未知错误"],
      },
      { status: 500 },
    );
  }
}
