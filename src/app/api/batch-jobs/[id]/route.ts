import { NextResponse } from "next/server";
import { getBatchJobDetail, reconcileInterruptedBatchJobs } from "@/lib/batch-jobs/batch-job-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BatchJobRouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: BatchJobRouteProps) {
  try {
    const { id } = await params;
    await reconcileInterruptedBatchJobs({ jobId: id });
    const job = await getBatchJobDetail(id);

    if (!job) {
      return NextResponse.json(
        {
          success: false,
          message: "批量任务不存在。",
          errors: ["未找到对应批量任务。"],
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: job,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "读取批量任务详情失败。",
        errors: [error instanceof Error ? error.message : "未知错误。"],
      },
      { status: 500 },
    );
  }
}
