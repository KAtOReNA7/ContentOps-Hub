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
  runner: SingleRatingRunner<T>;
  workId: string;
};

export async function executeSingleRatingRequestCore<T>({
  body,
  findRunningRun,
  runner,
  workId,
}: ExecuteSingleRatingOptions<T>) {
  const provider = resolveSingleRatingProvider();

  if (provider === "openai" && body.costConfirmed !== true) {
    return failure({
      code: "COST_CONFIRMATION_REQUIRED",
      userMessage: "本次操作将调用真实 OpenAI API，必须先确认可能产生费用。",
      hint: "请在作品详情页确认本次只处理一部作品，并点击“确认并调用 OpenAI”。",
      httpStatus: 400,
      runStatus: "failed",
    });
  }

  const runningRun = await findRunningRun(workId);
  if (runningRun) {
    return failure({
      code: "RATING_ALREADY_RUNNING",
      userMessage: "该作品已有 OpenAI 评级正在运行，本次请求未执行。",
      hint: "请等待当前评级完成后再重试；系统不会创建重复运行记录。",
      httpStatus: 409,
      runStatus: "failed",
    });
  }

  try {
    const data = await runner(workId, { adoptResult: body.adoptResult === true });
    return {
      body: { success: true, data },
      status: 200,
    };
  } catch (error) {
    return failure(normalizeRatingError(error));
  }
}

function resolveSingleRatingProvider(): "openai" {
  return "openai";
}

function failure(error: NormalizedRatingError) {
  return {
    body: ratingErrorResponse(error),
    status: error.httpStatus,
  };
}
