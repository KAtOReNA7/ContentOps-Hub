import { NextResponse } from "next/server";
import { deleteRatingSupplement } from "@/lib/rating/openai-rating-service";
export const runtime = "nodejs";
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; supplementId: string }> }) {
  try {
    const { id, supplementId } = await params;
    await deleteRatingSupplement(id, supplementId);
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ success: false, message: "删除补充证据失败。", errors: [safeMessage(error)] }, { status: 400 }); }
}
function safeMessage(error: unknown) { return error instanceof Error ? error.message : "未知错误"; }
