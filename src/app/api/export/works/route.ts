import { NextResponse } from "next/server";
import { buildWorksExportWorkbook } from "@/lib/export/export-excel";
import { buildAllWorksExport } from "@/lib/export/export-service";
import type { ExportWorkFilters } from "@/lib/export/export-types";

export const runtime = "nodejs";

const excelMimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function GET(request: Request) {
  try {
    const payload = await buildAllWorksExport(filtersFromRequest(request));
    const workbook = buildWorksExportWorkbook(payload.rows);
    const body = workbook.buffer.slice(workbook.byteOffset, workbook.byteOffset + workbook.byteLength) as ArrayBuffer;

    return new Response(body, {
      headers: {
        "Content-Disposition": `attachment; filename="${encodeURIComponent(payload.fileName)}"`,
        "Content-Type": excelMimeType,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to export works.",
        errors: [error instanceof Error ? error.message : "Unknown error."],
      },
      { status: 500 },
    );
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
