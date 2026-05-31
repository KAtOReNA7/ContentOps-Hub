import { NextResponse } from "next/server";
import { adoptOpenAIRatingRun } from "@/lib/rating/openai-rating-service";
export const runtime = "nodejs";
export async function POST(_request: Request, { params }: { params: Promise<{ id: string; runId: string }> }) {
  try {
    const { id, runId } = await params;
    return NextResponse.json({ success: true, data: await adoptOpenAIRatingRun(id, runId) });
  } catch (error) {
    return NextResponse.json({ success: false, message: "采用 OpenAI 评级失败。", errors: [safeMessage(error)] }, { status: 400 });
  }
}
function safeMessage(error: unknown) { return error instanceof Error ? error.message : "未知错误"; }
