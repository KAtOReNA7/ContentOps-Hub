import {
  normalizeRatingError,
  ratingErrorResponse,
  type NormalizedRatingError,
// @ts-expect-error Node strip-types tests require the explicit TypeScript extension.
} from "./rating-errors.ts";

export type SingleRatingBody = {
  adoptResult?: boolean;
  costConfirmed?: boolean;
  provider?: string;
};

export type SingleRatingRunner<T = unknown> = (workId: string, options: { adoptResult?: boolean }) => Promise<T>;

export type ExecuteSingleRatingOptions<T = unknown> = {
  body: SingleRatingBody;
  findRunningRun: (workId: string) => Promise<{ id: string } | null>;
  preflight?: () => Promise<void> | void;
  runner: SingleRatingRunner<T>;
  workId: string;
};

const activeSingleRatingWorkIds = new Set<string>();

export async function executeSingleRatingRequestCore<T>({
  body,
  findRunningRun,
  preflight,
  runner,
  workId,
}: ExecuteSingleRatingOptions<T>) {
  const provider = resolveSingleRatingProvider();

  if (provider === "openai" && body.costConfirmed !== true) {
    return failure(costConfirmationRequiredError());
  }

  if (!acquireSingleRatingLock(workId)) {
    return failure(ratingAlreadyRunningError());
  }

  try {
    const runningRun = await findRunningRun(workId);
    if (runningRun) {
      return failure(ratingAlreadyRunningError());
    }

    await preflight?.();

    const data = await runner(workId, { adoptResult: body.adoptResult === true });
    return {
      body: { success: true, data },
      status: 200,
    };
  } catch (error) {
    return failure(normalizeRatingError(error));
  } finally {
    releaseSingleRatingLock(workId);
  }
}

export function isSingleRatingLockedForTest(workId: string) {
  return activeSingleRatingWorkIds.has(workId);
}

export function resetSingleRatingLocksForTest() {
  activeSingleRatingWorkIds.clear();
}

function acquireSingleRatingLock(workId: string) {
  if (activeSingleRatingWorkIds.has(workId)) return false;
  activeSingleRatingWorkIds.add(workId);
  return true;
}

function releaseSingleRatingLock(workId: string) {
  activeSingleRatingWorkIds.delete(workId);
}

function resolveSingleRatingProvider(): "openai" {
  return "openai";
}

function costConfirmationRequiredError(): NormalizedRatingError {
  return {
    code: "COST_CONFIRMATION_REQUIRED",
    userMessage: "本次操作将调用真实 OpenAI API，必须先确认可能产生费用。",
    hint: "请在作品详情页确认本次只处理一部作品，并点击“确认并调用 OpenAI”。",
    httpStatus: 400,
    runStatus: "failed",
  };
}

function ratingAlreadyRunningError(): NormalizedRatingError {
  return {
    code: "RATING_ALREADY_RUNNING",
    userMessage: "该作品已有 OpenAI 评级正在运行，本次请求未执行。",
    hint: "请等待当前评级完成后再重试；系统不会创建重复运行记录。",
    httpStatus: 409,
    runStatus: "failed",
  };
}

function failure(error: NormalizedRatingError) {
  return {
    body: ratingErrorResponse(error),
    status: error.httpStatus,
  };
}
