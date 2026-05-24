import { NextResponse } from "next/server";
import { buildWorksExportWorkbook } from "@/lib/export/export-excel";
import { buildAllWorksExport } from "@/lib/export/export-service";

export const runtime = "nodejs";

const excelMimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function GET() {
  try {
    const payload = await buildAllWorksExport();
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
