import { NextResponse } from "next/server";
import { createRatingSupplement, listRatingSupplements } from "@/lib/rating/openai-rating-service";
export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return NextResponse.json({ success: true, data: await listRatingSupplements((await params).id) });
}
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json();
    if (!body.title?.trim() || !body.content?.trim()) return NextResponse.json({ success: false, message: "补充证据标题和内容不能为空。", errors: [] }, { status: 400 });
    const evidenceUrl = body.evidenceUrl ? String(body.evidenceUrl).trim() : "";
    if (evidenceUrl && !isValidHttpUrl(evidenceUrl)) return NextResponse.json({ success: false, message: "证据链接格式不正确，请填写 http 或 https 开头的 URL。", errors: [] }, { status: 400 });
    return NextResponse.json({ success: true, data: await createRatingSupplement((await params).id, {
      sourceType: String(body.sourceType || "manual"),
      title: String(body.title).trim(),
      content: String(body.content).trim(),
      evidenceUrl: evidenceUrl || null,
      evidencePlatform: body.evidencePlatform ? String(body.evidencePlatform) : null,
      importance: body.importance === "high" || body.importance === "low" ? body.importance : "medium",
    }) });
  } catch (error) { return NextResponse.json({ success: false, message: "保存补充证据失败。", errors: [safeMessage(error)] }, { status: 400 }); }
}
function safeMessage(error: unknown) { return error instanceof Error ? error.message : "未知错误"; }
function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
