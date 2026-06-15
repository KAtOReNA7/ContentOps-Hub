import { NextResponse } from "next/server";
import { reconcileInterruptedBatchJobs, retryBatchJobItem, toPublicBatchError } from "@/lib/batch-jobs/batch-job-service";

export const runtime = "nodejs";

type RetryBatchJobItemRouteProps = {
  params: Promise<{
    id: string;
    itemId: string;
  }>;
};

export async function POST(_request: Request, { params }: RetryBatchJobItemRouteProps) {
  try {
    const { id, itemId } = await params;
    await reconcileInterruptedBatchJobs({ jobId: id });
    const job = await retryBatchJobItem(id, itemId);

    return NextResponse.json({
      success: true,
      data: job,
    });
  } catch (error) {
    const normalized = toPublicBatchError(error);
    const status = normalized.errorCode === "ITEM_NOT_FOUND" ? 404 : normalized.errorCode === "ITEM_NOT_FAILED" ? 400 : 500;

    return NextResponse.json(
      {
        success: false,
        message: normalized.errorMessage,
        errors: [`${normalized.errorCode}: ${normalized.hint}`],
      },
      { status },
    );
  }
}
