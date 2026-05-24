import { NextResponse } from "next/server";
import { buildWorksExportWorkbook } from "@/lib/export/export-excel";
import { buildSingleWorkExport } from "@/lib/export/export-service";

export const runtime = "nodejs";

const excelMimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

type ExportWorkRouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: ExportWorkRouteProps) {
  try {
    const { id } = await params;
    const payload = await buildSingleWorkExport(id);

    if (!payload) {
      return NextResponse.json({ success: false, message: "Work not found.", errors: [] }, { status: 404 });
    }

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
        message: "Failed to export work.",
        errors: [error instanceof Error ? error.message : "Unknown error."],
      },
      { status: 500 },
    );
  }
}
