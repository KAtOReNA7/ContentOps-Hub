import { NextResponse } from "next/server";
import { importExperimentResults } from "@/lib/experiments/experiment-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rows = Array.isArray(body?.rows) ? body.rows : null;

    if (!rows) {
      return NextResponse.json(
        {
          success: false,
          message: "测试结果导入参数不正确。",
          errors: ["rows 必须是数组。"],
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      data: await importExperimentResults({ rows }),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "测试结果导入失败。",
        errors: [error instanceof Error ? error.message : "未知错误。"],
      },
      { status: 500 },
    );
  }
}
