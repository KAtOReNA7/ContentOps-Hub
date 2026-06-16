// @ts-expect-error Node strip-types runtime requires the explicit TypeScript extension.
import { executeSingleRatingRequestCore, isSingleRatingLockedForTest, resetSingleRatingLocksForTest } from "../src/lib/rating/single-rating-request-core.ts";

resetSingleRatingLocksForTest();

let runnerCalls = 0;
let releaseRunner: () => void = () => {
  throw new Error("runnerStarted resolver was not initialized.");
};
const runnerStarted = new Promise<void>((resolve) => {
  releaseRunner = () => resolve();
});
let finishRunner: () => void = () => {
  throw new Error("runnerCanFinish resolver was not initialized.");
};
const runnerCanFinish = new Promise<void>((resolve) => {
  finishRunner = () => resolve();
});

const first = executeSingleRatingRequestCore({
  body: { costConfirmed: true },
  findRunningRun: async () => null,
  preflight: async () => undefined,
  runner: async () => {
    runnerCalls += 1;
    releaseRunner();
    await runnerCanFinish;
    return { id: "first-run" };
  },
  workId: "same-work",
});

await runnerStarted;

const second = await executeSingleRatingRequestCore({
  body: { costConfirmed: true },
  findRunningRun: async () => {
    throw new Error("Second request must not reach database running check.");
  },
  preflight: async () => {
    throw new Error("Second request must not reach preflight.");
  },
  runner: async () => {
    throw new Error("Second request must not call provider.");
  },
  workId: "same-work",
});

assert(second.status === 409, "Second concurrent request must return 409.");
assert(errorCode(second.body) === "RATING_ALREADY_RUNNING", "Second concurrent request must return RATING_ALREADY_RUNNING.");
assert(runnerCalls === 1, "Only one runner may execute for the same workId.");
assert(isSingleRatingLockedForTest("same-work"), "Lock should stay held while first runner is active.");

finishRunner();
const firstResult = await first;
assert(firstResult.status === 200, "First request should complete successfully.");
assert(!isSingleRatingLockedForTest("same-work"), "Lock must be released after success.");

const afterRelease = await executeSingleRatingRequestCore({
  body: { costConfirmed: true },
  findRunningRun: async () => null,
  preflight: async () => undefined,
  runner: async () => {
    runnerCalls += 1;
    return { id: "after-release" };
  },
  workId: "same-work",
});
assert(afterRelease.status === 200, "Request after lock release should run.");
assert(runnerCalls === 2, "Runner should execute again after lock release.");

const thrown = await executeSingleRatingRequestCore({
  body: { costConfirmed: true },
  findRunningRun: async () => null,
  preflight: async () => undefined,
  runner: async () => {
    throw Object.assign(new Error("fetch failed"), { status: 502 });
  },
  workId: "throwing-work",
});
assert(thrown.status === 502, "Thrown provider errors should return safe failure.");
assert(!isSingleRatingLockedForTest("throwing-work"), "Lock must be released after runner throws.");

const retryAfterThrow = await executeSingleRatingRequestCore({
  body: { costConfirmed: true },
  findRunningRun: async () => null,
  preflight: async () => undefined,
  runner: async () => ({ id: "retry-after-throw" }),
  workId: "throwing-work",
});
assert(retryAfterThrow.status === 200, "Request after thrown runner should run again.");

console.log("Single rating concurrency tests passed.");

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function errorCode(value: unknown) {
  return typeof value === "object" && value !== null && "code" in value ? String(value.code) : "";
}
