import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const file = await readFile(path.join(process.cwd(), "sample", "experiment-results-template.xlsx"));
    return new NextResponse(file, {
      headers: {
        "Content-Disposition": 'attachment; filename="experiment-results-template.xlsx"',
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch {
    return NextResponse.json({ success: false, message: "测试结果导入模板暂不可用。", errors: [] }, { status: 500 });
  }
}
