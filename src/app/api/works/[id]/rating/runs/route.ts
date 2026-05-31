import { NextResponse } from "next/server";
import { listOpenAIRatingRuns } from "@/lib/rating/openai-rating-service";
export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { return NextResponse.json({ success: true, data: await listOpenAIRatingRuns((await params).id) }); }
  catch (error) { return NextResponse.json({ success: false, message: "读取评级历史失败。", errors: [safeMessage(error)] }, { status: 500 }); }
}
function safeMessage(error: unknown) { return error instanceof Error ? error.message : "未知错误"; }
