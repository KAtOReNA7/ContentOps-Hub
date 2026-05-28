import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { buildWorksExportWorkbook } from "@/lib/export/export-excel";
import { findWorksForExport, toExportRow } from "@/lib/export/export-service";
import type { ExportWorkFilters } from "@/lib/export/export-types";
import { buildZip } from "@/lib/export/zip";

export const runtime = "nodejs";

const zipMimeType = "application/zip";

export async function GET(request: Request) {
  try {
    const works = await findWorksForExport(filtersFromRequest(request));
    const workbook = buildWorksExportWorkbook(works.map((work) => toExportRow(work)));
    const entries = [{ data: workbook, name: "作品运营建议.xlsx" }];

    for (const work of works) {
      const file = await finalCoverFileForWork(work);
      if (file) {
        entries.push({
          data: file.data,
          name: `${safeFilePart(work.externalId || work.title || work.id)}/最终封面-${file.label}.png`,
        });
      }
    }

    const zip = buildZip(entries);
    const body = zip.buffer.slice(zip.byteOffset, zip.byteOffset + zip.byteLength) as ArrayBuffer;

    return new Response(body, {
      headers: {
        "Content-Disposition": `attachment; filename="${encodeURIComponent(`works-delivery-${datePart()}.zip`)}"`,
        "Content-Type": zipMimeType,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to export delivery ZIP.",
        errors: [error instanceof Error ? error.message : "Unknown error."],
      },
      { status: 500 },
    );
  }
}

type WorkWithCovers = Awaited<ReturnType<typeof findWorksForExport>>[number];

async function finalCoverFileForWork(work: WorkWithCovers): Promise<{ data: Buffer; label: string } | null> {
  const render = work.finalCoverRenderId
    ? work.coverRenders.find((item) => item.id === work.finalCoverRenderId)
    : work.coverRenders.find((item) => item.status === "success" && item.outputPath);

  if (render?.status === "success" && render.outputPath) {
    const data = await readSafeUploadFile(render.outputPath);
    return data ? { data, label: `${render.provider}-${render.outputRatio}` } : null;
  }

  const asset = work.finalCoverAssetId
    ? work.coverAssets.find((item) => item.id === work.finalCoverAssetId)
    : work.coverAssets[0];
  if (asset?.sourceType === "local_upload" && asset.storagePath) {
    const data = await readSafeUploadFile(asset.storagePath);
    return data ? { data, label: "original" } : null;
  }

  return null;
}

async function readSafeUploadFile(storagePath: string): Promise<Buffer | null> {
  const uploadsRoot = path.resolve(process.cwd(), "uploads");
  const relativePath = storagePath.replace(/^uploads[\\/]/, "");
  const resolvedPath = path.resolve(uploadsRoot, relativePath);

  if (!resolvedPath.startsWith(uploadsRoot)) {
    return null;
  }

  try {
    return await readFile(resolvedPath);
  } catch {
    return null;
  }
}

function filtersFromRequest(request: Request): ExportWorkFilters {
  const searchParams = new URL(request.url).searchParams;
  const ids = searchParams
    .get("ids")
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    author: searchParams.get("author") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    externalId: searchParams.get("externalId") ?? undefined,
    ids,
    rating: searchParams.get("rating") ?? undefined,
    reviewStatus: searchParams.get("reviewStatus") ?? undefined,
    title: searchParams.get("title") ?? undefined,
  };
}

function safeFilePart(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, "_").slice(0, 80) || "work";
}

function datePart(): string {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
}
