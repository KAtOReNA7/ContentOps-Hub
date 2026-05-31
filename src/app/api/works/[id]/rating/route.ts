import { NextResponse } from "next/server";
import { listOpenAIRatingRuns, runOpenAIRating } from "@/lib/rating/openai-rating-service";
import { mapRatingFailureToUserMessage } from "@/lib/rating/rating-error-messages";

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
  try {
    const { id } = await params;
    return NextResponse.json({ success: true, data: await runOpenAIRating(id) });
  } catch (error) {
    return failed("OpenAI 作品评级失败。", error);
  }
}

function failed(message: string, error: unknown) {
  return NextResponse.json({ success: false, message, errors: [safeMessage(error)] }, { status: 500 });
}
function safeMessage(error: unknown) { return mapRatingFailureToUserMessage(error); }
