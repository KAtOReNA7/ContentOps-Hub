import { NextResponse } from "next/server";
import { isRemoteCoverUrl, validateImportRows, type RawImportRow } from "@/lib/import/validation";
import { prisma } from "@/server/db";

export const runtime = "nodejs";

type ImportWorksRequest = {
  rows: RawImportRow[];
};

type ImportRowError = {
  rowNumber: number;
  reason: string;
};

export async function POST(request: Request) {
  let rows: RawImportRow[] = [];

  try {
    const body = (await request.json()) as ImportWorksRequest;
    rows = Array.isArray(body.rows) ? body.rows : [];
    const previewRows = validateImportRows(rows);
    const errors: ImportRowError[] = previewRows
      .filter((row) => !row.importable)
      .map((row) => ({
        rowNumber: row.rowNumber,
        reason: row.errors.join("、") || "不可导入",
      }));
    let created = 0;

    for (const row of previewRows.filter((item) => item.importable)) {
      const duplicate = await prisma.work.findFirst({
        where: {
          OR: [
            { externalId: row.externalId },
            {
              title: row.title,
              author: row.author,
            },
          ],
        },
        select: {
          id: true,
        },
      });

      if (duplicate) {
        errors.push({ rowNumber: row.rowNumber, reason: "重复作品" });
        continue;
      }

      const remoteCoverUrl = isRemoteCoverUrl(row.coverFileName) ? row.coverFileName.trim() : "";
      const remoteCoverOriginalName = remoteCoverUrl ? originalNameFromRemoteCoverUrl(remoteCoverUrl, row.externalId) : "";
      const savedWork = await prisma.work.create({
        data: {
          externalId: row.externalId,
          title: row.title,
          author: row.author,
          description: row.description,
          coverUrl: remoteCoverUrl || null,
          coverFileName: remoteCoverOriginalName || row.coverFileName || null,
          category: row.category || null,
          currentPlays: row.currentPlays,
          currentCtr: row.currentCtr,
          currentFinish: row.currentFinish,
          notes: row.notes || null,
          status: "imported",
        },
        select: {
          id: true,
        },
      });

      if (remoteCoverUrl) {
        await prisma.coverAsset.create({
          data: {
            workId: savedWork.id,
            fileName: remoteCoverOriginalName,
            originalName: remoteCoverOriginalName,
            mimeType: inferMimeTypeFromRemoteCoverUrl(remoteCoverUrl),
            sizeBytes: 0,
            storagePath: null,
            sourceType: "remote_url",
            remoteUrl: remoteCoverUrl,
            status: "unchecked",
            errorMessage: null,
          },
        });
      }

      created += 1;
    }

    return NextResponse.json({
      success: true,
      message: `导入完成：成功 ${created} 条，跳过 ${errors.length} 条。`,
      created,
      skipped: errors.length,
      errors,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "导入失败",
        created: 0,
        skipped: rows.length,
        errors: [
          {
            rowNumber: 0,
            reason: error instanceof Error ? error.message : "未知错误",
          },
        ],
      },
      { status: 500 },
    );
  }
}

function originalNameFromRemoteCoverUrl(remoteUrl: string, fallbackId: string): string {
  try {
    const pathname = new URL(remoteUrl).pathname;
    const fileName = decodeURIComponent(pathname.split("/").filter(Boolean).at(-1) ?? "");

    if (fileName) {
      return sanitizeRemoteFileName(fileName);
    }
  } catch {
    // Fall through to deterministic fallback.
  }

  return `cover-${sanitizeRemoteFileName(fallbackId || "work")}-${Date.now()}.jpg`;
}

function sanitizeRemoteFileName(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, "_").slice(0, 180) || "cover.jpg";
}

function inferMimeTypeFromRemoteCoverUrl(remoteUrl: string): string {
  const pathname = (() => {
    try {
      return new URL(remoteUrl).pathname.toLowerCase();
    } catch {
      return "";
    }
  })();

  if (pathname.endsWith(".png")) return "image/png";
  if (pathname.endsWith(".webp")) return "image/webp";
  if (pathname.endsWith(".gif")) return "image/gif";

  return "image/jpeg";
}
