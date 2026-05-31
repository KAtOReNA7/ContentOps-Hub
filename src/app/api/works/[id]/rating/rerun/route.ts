import { NextResponse } from "next/server";
import { runOpenAIRating } from "@/lib/rating/openai-rating-service";
import { mapRatingFailureToUserMessage } from "@/lib/rating/rating-error-messages";
export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json().catch(() => ({})) as { adoptResult?: boolean };
    return NextResponse.json({ success: true, data: await runOpenAIRating((await params).id, { adoptResult: body.adoptResult === true }) });
  } catch (error) {
    return NextResponse.json({ success: false, message: "重新运行 OpenAI 评级失败。", errors: [safeMessage(error)] }, { status: 500 });
  }
}
function safeMessage(error: unknown) { return mapRatingFailureToUserMessage(error); }
