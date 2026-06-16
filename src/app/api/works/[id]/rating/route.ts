import { NextResponse } from "next/server";
import { listOpenAIRatingRuns } from "@/lib/rating/openai-rating-service";
import { handleSingleRatingRunRequest } from "@/lib/rating/single-rating-request";

export const runtime = "nodejs";
type Props = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Props) {
  try {
    const { id } = await params;
    return NextResponse.json({ success: true, data: await listOpenAIRatingRuns(id) });
  } catch (error) {
    return failed("读取 OpenAI 评级记录失败。", error);
  }
}

export async function POST(_request: Request, { params }: Props) {
  const result = await handleSingleRatingRunRequest(_request, (await params).id);
  return NextResponse.json(result.body, { status: result.status });
}

function failed(message: string, error: unknown) {
  return NextResponse.json({ success: false, message, errors: [safeMessage(error)] }, { status: 500 });
}
function safeMessage(error: unknown) { return error instanceof Error ? error.message : "未知错误"; }
