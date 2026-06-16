import { NextResponse } from "next/server";
import { listOpenAIRatingRuns } from "@/lib/rating/openai-rating-service";
import { ratingHistoryReadErrorResponse } from "@/lib/rating/rating-errors";
import { handleSingleRatingRunRequest } from "@/lib/rating/single-rating-request";

export const runtime = "nodejs";
type Props = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Props) {
  try {
    const { id } = await params;
    return NextResponse.json({ success: true, data: await listOpenAIRatingRuns(id) });
  } catch {
    return NextResponse.json(ratingHistoryReadErrorResponse(), { status: 500 });
  }
}

export async function POST(_request: Request, { params }: Props) {
  const result = await handleSingleRatingRunRequest(_request, (await params).id);
  return NextResponse.json(result.body, { status: result.status });
}
