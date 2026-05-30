import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const templatePath = path.join(process.cwd(), "sample", "input-template.xlsx");
    const file = await readFile(templatePath);

    return new NextResponse(file, {
      headers: {
        "Content-Disposition": 'attachment; filename="input-template.xlsx"',
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "导入模板暂不可用。",
        errors: ["请检查 sample/input-template.xlsx 是否存在。"],
      },
      { status: 500 },
    );
  }
}
