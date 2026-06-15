// @ts-expect-error Node strip-types runtime requires the explicit TypeScript extension.
import { PROCESS_INTERRUPTED_CODE, reconcileInterruptedBatchJobsWithClient, registerActiveBatchJobForTest } from "../src/lib/batch-jobs/batch-job-recovery.ts";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TEST_PREFIX = "batch-recovery-test";
const BROWSER_PREFIX = "batch-recovery-browser-fixture";

type ItemSeed = {
  status: "pending" | "running" | "success" | "failed" | "skipped";
  resultSummaryJson?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
};

async function main() {
  const command = process.argv[2];

  if (command === "--seed-browser-fixture") {
    await cleanup(BROWSER_PREFIX);
    const fixture = await seedBrowserFixture();
    console.log(JSON.stringify(fixture, null, 2));
    return;
  }

  if (command === "--cleanup-browser-fixture") {
    await cleanup(BROWSER_PREFIX);
    console.log("Batch recovery browser fixture cleaned up.");
    return;
  }

  await cleanup(TEST_PREFIX);

  try {
    await testInterruptedRunningJobRecovery();
    await testRecoveryIdempotency();
    await testActiveJobIsNotInterrupted();
    await testCompletedResultIsPreserved();
    await testRetryableRangeExcludesSuccessItems();
    console.log("Batch job interruption recovery tests passed.");
  } finally {
    await cleanup(TEST_PREFIX);
  }
}

async function testInterruptedRunningJobRecovery() {
  const successSummary = JSON.stringify({ preserved: true, generationId: "kept-result" });
  const job = await createJob(TEST_PREFIX, "running", [
    { status: "success", resultSummaryJson: successSummary },
    { status: "running" },
    { status: "pending" },
  ]);

  const result = await reconcileInterruptedBatchJobsWithClient(prisma, { jobId: job.id, now: futureNow(), graceMs: 0 });
  assert(result.reconciledJobIds.includes(job.id), "Interrupted running job should be reconciled.");

  const detail = await getJob(job.id);
  assert(detail?.status === "partial_success", "Parent job should become partial_success when successful results already exist.");
  assert(detail.successCount === 1, "Successful item count should remain unchanged.");
  assert(detail.failedCount === 2, "Unfinished items should become failed and retryable.");
  assert(detail.errorSummary?.includes(PROCESS_INTERRUPTED_CODE) === true, "Parent job should store PROCESS_INTERRUPTED.");

  const successItem = detail.items.find((item) => item.resultSummaryJson === successSummary);
  assert(successItem?.status === "success", "Successful item should keep success status.");

  const interruptedItems = detail.items.filter((item) => item.errorCode === PROCESS_INTERRUPTED_CODE);
  assert(interruptedItems.length === 2, "Running and pending items should store PROCESS_INTERRUPTED.");
  assert(interruptedItems.every((item) => item.status === "failed"), "Interrupted items should use existing failed retry state.");
}

async function testRecoveryIdempotency() {
  const job = await createJob(TEST_PREFIX, "running", [
    { status: "success", resultSummaryJson: JSON.stringify({ preserved: "idempotent" }) },
    { status: "running" },
  ]);

  const first = await reconcileInterruptedBatchJobsWithClient(prisma, { jobId: job.id, now: futureNow(), graceMs: 0 });
  const afterFirst = await getJob(job.id);
  const second = await reconcileInterruptedBatchJobsWithClient(prisma, { jobId: job.id, now: futureNow(), graceMs: 0 });
  const afterSecond = await getJob(job.id);

  assert(first.reconciledJobIds.length === 1, "First recovery should reconcile the job.");
  assert(second.reconciledJobIds.length === 0, "Second recovery should not reconcile the same terminal job again.");
  assert(afterSecond.failedCount === afterFirst.failedCount, "Idempotent recovery should not inflate failed counts.");
  assert(afterSecond.items.length === afterFirst.items.length, "Idempotent recovery should not create duplicate items.");
}

async function testActiveJobIsNotInterrupted() {
  const job = await createJob(TEST_PREFIX, "running", [
    { status: "running" },
    { status: "pending" },
  ]);
  const release = registerActiveBatchJobForTest(job.id);

  try {
    const result = await reconcileInterruptedBatchJobsWithClient(prisma, { jobId: job.id, now: futureNow(), graceMs: 0 });
    const detail = await getJob(job.id);

    assert(result.reconciledJobIds.length === 0, "Active in-process job should not be reconciled as interrupted.");
    assert(detail.status === "running", "Active parent job should remain running.");
    assert(detail.items.some((item) => item.status === "running"), "Active running item should remain running.");
    assert(detail.items.some((item) => item.status === "pending"), "Active pending item should remain pending.");
  } finally {
    release();
  }
}

async function testCompletedResultIsPreserved() {
  const preservedSummary = JSON.stringify({ output: "do-not-overwrite", nested: { value: 1 } });
  const job = await createJob(TEST_PREFIX, "running", [
    { status: "success", resultSummaryJson: preservedSummary },
    { status: "pending" },
  ]);

  await reconcileInterruptedBatchJobsWithClient(prisma, { jobId: job.id, now: futureNow(), graceMs: 0 });
  const detail = await getJob(job.id);
  const successItem = detail.items.find((item) => item.status === "success");

  assert(successItem?.resultSummaryJson === preservedSummary, "Completed item resultSummaryJson should be preserved exactly.");
  assert(successItem?.errorCode === null, "Completed item errorCode should not be overwritten.");
}

async function testRetryableRangeExcludesSuccessItems() {
  const job = await createJob(TEST_PREFIX, "running", [
    { status: "success", resultSummaryJson: JSON.stringify({ alreadyDone: true }) },
    { status: "failed", errorCode: "COVER_ASSET_REQUIRED", errorMessage: "missing cover" },
    { status: "running" },
    { status: "pending" },
  ]);

  await reconcileInterruptedBatchJobsWithClient(prisma, { jobId: job.id, now: futureNow(), graceMs: 0 });
  const detail = await getJob(job.id);
  const retryableItems = detail.items.filter((item) => item.status === "failed");
  const successItems = detail.items.filter((item) => item.status === "success");

  assert(retryableItems.length === 3, "Only existing failed and interrupted unfinished items should be retryable.");
  assert(successItems.length === 1, "Successful items should not enter the retryable failed range.");
  assert(successItems[0]?.retryCount === 0, "Successful items should not be retried or mutated.");
}

async function seedBrowserFixture() {
  const completed = await createJob(BROWSER_PREFIX, "success", [
    { status: "success", resultSummaryJson: JSON.stringify({ provider: "mock", status: "success" }) },
  ]);
  await prisma.batchJob.update({
    where: { id: completed.id },
    data: {
      successCount: 1,
      failedCount: 0,
      skippedCount: 0,
      finishedAt: new Date(),
    },
  });

  const interrupted = await createJob(BROWSER_PREFIX, "running", [
    { status: "success", resultSummaryJson: JSON.stringify({ provider: "mock", preserved: true }) },
    { status: "running" },
    { status: "pending" },
  ]);
  await reconcileInterruptedBatchJobsWithClient(prisma, { jobId: interrupted.id, now: futureNow(), graceMs: 0 });

  return {
    completedJobId: completed.id,
    interruptedJobId: interrupted.id,
  };
}

async function createJob(prefix: string, status: "pending" | "running" | "success", items: ItemSeed[]) {
  const createdAt = new Date(Date.now() - 120_000);
  const work = await prisma.work.create({
    data: {
      externalId: `${prefix}-${crypto.randomUUID()}`,
      title: `${prefix} work`,
      author: "Codex Test",
      description: "Local batch recovery test fixture.",
      category: "test",
    },
  });

  return prisma.batchJob.create({
    data: {
      type: "cover_evaluation",
      status,
      totalCount: items.length,
      successCount: items.filter((item) => item.status === "success").length,
      failedCount: items.filter((item) => item.status === "failed").length,
      skippedCount: items.filter((item) => item.status === "skipped").length,
      createdAt,
      startedAt: status === "pending" ? null : createdAt,
      note: `${prefix} fixture`,
      costRiskAccepted: false,
      providerSummaryJson: JSON.stringify({
        identifyProviderMode: "mock",
        titleIntroProvider: "mock",
      }),
      items: {
        create: items.map((item) => ({
          workId: work.id,
          step: "cover_evaluation",
          status: item.status,
          errorCode: item.errorCode ?? null,
          errorMessage: item.errorMessage ?? null,
          resultSummaryJson: item.resultSummaryJson ?? null,
          startedAt: item.status === "pending" ? null : createdAt,
          finishedAt: item.status === "success" || item.status === "failed" || item.status === "skipped" ? createdAt : null,
          createdAt,
        })),
      },
    },
  });
}

async function getJob(id: string) {
  const job = await prisma.batchJob.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      },
    },
  });

  assert(job !== null, `Expected batch job ${id} to exist.`);
  return job;
}

async function cleanup(prefix: string) {
  await prisma.batchJob.deleteMany({
    where: {
      note: {
        startsWith: prefix,
      },
    },
  });
  await prisma.work.deleteMany({
    where: {
      externalId: {
        startsWith: prefix,
      },
    },
  });
}

function futureNow() {
  return new Date(Date.now() + 60_000);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
