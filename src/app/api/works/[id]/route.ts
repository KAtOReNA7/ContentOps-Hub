import { NextResponse } from "next/server";
import { normalizeContentType } from "@/lib/evidence/source-taxonomy";
import { prisma } from "@/server/db";
export const runtime = "nodejs";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json() as { contentType?: unknown };
    const contentType = normalizeContentType(body.contentType);
    const work = await prisma.work.update({ where: { id: (await params).id }, data: { contentType }, select: { id: true, contentType: true } });
    return NextResponse.json({ success: true, data: work });
  } catch (error) {
    return NextResponse.json({ success: false, message: "更新作品类型失败。", errors: [error instanceof Error ? error.message : "未知错误"] }, { status: 400 });
  }
}
