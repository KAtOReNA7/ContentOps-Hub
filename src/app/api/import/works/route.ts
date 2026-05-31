import { NextResponse } from "next/server";
import {
  isRemoteCoverUrl,
  validateImportRows,
  type RawImportRow,
} from "@/lib/import/validation";
import { prisma } from "@/server/db";

export const runtime = "nodejs";

type ImportWorksRequest = { rows: RawImportRow[] };
type ImportRowError = { rowNumber: number; reason: string };

export async function POST(request: Request) {
  let rows: RawImportRow[] = [];

  try {
    const body = (await request.json()) as ImportWorksRequest;
    rows = Array.isArray(body.rows) ? body.rows : [];
    const previewRows = validateImportRows(rows);
    const skippedEmpty = previewRows.filter((row) => row.empty).length;
    const errors: ImportRowError[] = previewRows
      .filter((row) => !row.importable && !row.empty)
      .map((row) => ({
        rowNumber: row.rowNumber,
        reason: row.errors.join("；") || "该行不可导入。",
      }));
    let created = 0;

    for (const row of previewRows.filter((item) => item.importable)) {
      const duplicateChecks = [
        row.externalId ? { externalId: row.externalId } : null,
        row.author ? { title: row.title, author: row.author } : null,
      ].filter(Boolean) as Array<{ externalId: string } | { title: string; author: string }>;
      const duplicate = duplicateChecks.length
        ? await prisma.work.findFirst({
            where: { OR: duplicateChecks },
            select: { id: true },
          })
        : null;

      if (duplicate) {
        errors.push({
          rowNumber: row.rowNumber,
          reason: "检测到重复作品，已跳过。请检查作品 ID 或书名 + 作者。",
        });
        continue;
      }

      const remoteCoverUrl = isRemoteCoverUrl(row.coverFileName)
        ? row.coverFileName.trim()
        : "";
      const remoteCoverOriginalName = remoteCoverUrl
        ? originalNameFromRemoteCoverUrl(remoteCoverUrl, row.externalId)
        : "";
      const savedWork = await prisma.work.create({
        data: {
          externalId: row.externalId || null,
          title: row.title,
          author: row.author || null,
          description: row.description,
          coverUrl: remoteCoverUrl || null,
          coverFileName: remoteCoverOriginalName || row.coverFileName || null,
          category: row.category || null,
          contentType: row.contentType,
          currentPlays: row.currentPlays,
          currentCtr: row.currentCtr,
          currentFinish: row.currentFinish,
          notes: row.notes || null,
          status: "imported",
        },
        select: { id: true },
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
      message: `导入完成：成功 ${created} 条，失败或重复跳过 ${errors.length} 条，空行跳过 ${skippedEmpty} 条。`,
      total: rows.length,
      created,
      skipped: errors.length,
      skippedEmpty,
      errors,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "导入失败。",
        total: rows.length,
        created: 0,
        skipped: rows.length,
        skippedEmpty: 0,
        errors: [
          {
            rowNumber: 0,
            reason: error instanceof Error ? error.message : "未知错误。",
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
    if (fileName) return sanitizeRemoteFileName(fileName);
  } catch {
    // Use a deterministic fallback file name.
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
