import type { BatchJob, BatchJobItem, PrismaClient } from "@prisma/client";

type PrismaForBatchRecovery = Pick<PrismaClient, "batchJob" | "batchJobItem" | "$transaction">;

type BatchError = {
  errorCode: string;
  errorMessage: string;
  hint: string;
  provider?: string;
};

export const PROCESS_INTERRUPTED_CODE = "PROCESS_INTERRUPTED";

const DEFAULT_INTERRUPTION_GRACE_MS = 30_000;
const activeBatchJobIds = new Set<string>();

export function markBatchJobActive(jobId: string) {
  activeBatchJobIds.add(jobId);
}

export function unmarkBatchJobActive(jobId: string) {
  activeBatchJobIds.delete(jobId);
}

export function isBatchJobActiveInCurrentProcess(jobId: string) {
  return activeBatchJobIds.has(jobId);
}

export function registerActiveBatchJobForTest(jobId: string) {
  markBatchJobActive(jobId);
  return () => unmarkBatchJobActive(jobId);
}

export async function reconcileInterruptedBatchJobsWithClient(
  prisma: PrismaForBatchRecovery,
  options: { now?: Date; graceMs?: number; jobId?: string } = {},
) {
  const now = options.now ?? new Date();
  const graceMs = options.graceMs ?? getInterruptionGraceMs();
  const candidates = await prisma.batchJob.findMany({
    where: {
      status: { in: ["pending", "running"] },
      ...(options.jobId ? { id: options.jobId } : {}),
    },
    include: {
      items: {
        select: {
          id: true,
          status: true,
          updatedAt: true,
        },
      },
    },
  });

  const reconciledJobIds: string[] = [];

  for (const candidate of candidates) {
    if (isBatchJobActiveInCurrentProcess(candidate.id)) continue;

    const latestActivityAt = latestBatchJobActivityAt(candidate);
    if (now.getTime() - latestActivityAt.getTime() < graceMs) continue;

    const reconciled = await prisma.$transaction(async (tx) => {
      if (isBatchJobActiveInCurrentProcess(candidate.id)) return false;

      const job = await tx.batchJob.findUnique({
        where: { id: candidate.id },
        include: {
          items: {
            select: {
              id: true,
              status: true,
              updatedAt: true,
            },
          },
        },
      });

      if (!job || (job.status !== "pending" && job.status !== "running")) return false;
      if (isBatchJobActiveInCurrentProcess(job.id)) return false;

      const latestInsideTransaction = latestBatchJobActivityAt(job);
      if (now.getTime() - latestInsideTransaction.getTime() < graceMs) return false;

      const unfinishedIds = job.items
        .filter((item) => item.status === "pending" || item.status === "running")
        .map((item) => item.id);

      if (unfinishedIds.length === 0) return false;

      const interruptedError = interruptedBatchError();

      await tx.batchJobItem.updateMany({
        where: {
          id: { in: unfinishedIds },
          status: { in: ["pending", "running"] },
        },
        data: {
          status: "failed",
          errorCode: PROCESS_INTERRUPTED_CODE,
          errorMessage: JSON.stringify(interruptedError),
          resultSummaryJson: JSON.stringify({
            status: "interrupted",
            errorCode: PROCESS_INTERRUPTED_CODE,
            retryable: true,
          }),
          finishedAt: now,
        },
      });

      const grouped = await tx.batchJobItem.groupBy({
        by: ["status"],
        where: { batchJobId: job.id },
        _count: { _all: true },
      });
      const counts = Object.fromEntries(grouped.map((item) => [item.status, item._count._all]));
      const successCount = counts.success ?? 0;
      const failedCount = counts.failed ?? 0;
      const skippedCount = counts.skipped ?? 0;
      const completedCount = successCount + skippedCount;
      const totalCount = successCount + failedCount + skippedCount + (counts.running ?? 0) + (counts.pending ?? 0);

      await tx.batchJob.update({
        where: { id: job.id },
        data: {
          status: completedCount > 0 ? "partial_success" : "failed",
          totalCount,
          successCount,
          failedCount,
          skippedCount,
          finishedAt: now,
          errorSummary: `${PROCESS_INTERRUPTED_CODE}: ${interruptedError.errorMessage}`,
        },
      });

      return true;
    });

    if (reconciled) reconciledJobIds.push(candidate.id);
  }

  return { reconciledJobIds };
}

function interruptedBatchError(): BatchError {
  return {
    errorCode: PROCESS_INTERRUPTED_CODE,
    errorMessage: "任务因应用进程中断而停止。已完成结果已保留，未完成项目可以重试。",
    hint: "请在批量任务中心手动重试失败项；系统不会自动重新调用搜索或 OpenAI。",
  };
}

function getInterruptionGraceMs() {
  const configured = Number(process.env.BATCH_JOB_INTERRUPTION_GRACE_MS);
  return Number.isFinite(configured) && configured >= 0 ? configured : DEFAULT_INTERRUPTION_GRACE_MS;
}

function latestBatchJobActivityAt(job: Pick<BatchJob, "createdAt" | "startedAt"> & { items: Array<Pick<BatchJobItem, "updatedAt">> }) {
  const timestamps = [
    job.createdAt,
    job.startedAt,
    ...job.items.map((item) => item.updatedAt),
  ].filter((value): value is Date => value instanceof Date);

  return timestamps.reduce((latest, value) => (value.getTime() > latest.getTime() ? value : latest), job.createdAt);
}
