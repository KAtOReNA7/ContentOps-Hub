import { NextResponse } from "next/server";
import { handleSingleRatingRunRequest } from "@/lib/rating/single-rating-request";
export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await handleSingleRatingRunRequest(request, (await params).id);
  return NextResponse.json(result.body, { status: result.status });
}
