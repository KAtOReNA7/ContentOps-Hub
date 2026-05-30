import { NextResponse } from "next/server";
import { applyExperimentWinner } from "@/lib/experiments/experiment-service";

export const runtime = "nodejs";

type AdoptExperimentRouteProps = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: AdoptExperimentRouteProps) {
  try {
    const { id } = await params;
    const body = await request.json();
    const reviewId = typeof body?.reviewId === "string" ? body.reviewId : "";

    if (!reviewId) {
      return NextResponse.json(
        {
          success: false,
          message: "缺少复盘结论 ID。",
          errors: ["reviewId 必填。"],
        },
        { status: 400 },
      );
    }

    const work = await applyExperimentWinner(id, reviewId);

    return NextResponse.json({
      success: true,
      data: {
        workId: work.id,
        finalTitle: work.finalTitle,
        finalIntro: work.finalIntro,
        finalCoverUrl: work.finalCoverUrl,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "采用实验胜出版本失败。",
        errors: [error instanceof Error ? error.message : "未知错误。"],
      },
      { status: 500 },
    );
  }
}
