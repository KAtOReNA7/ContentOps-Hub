import type { WorkRatingRun } from "@prisma/client";
import { prisma } from "@/server/db";
import { runOpenAIRating } from "@/lib/rating/openai-rating-service";
import { createRatingRequestError } from "@/lib/rating/rating-errors";
import { executeSingleRatingRequestCore, type SingleRatingBody } from "@/lib/rating/single-rating-request-core";

type SingleRatingRunner = typeof runOpenAIRating;

type ExecuteOptions = {
  body: SingleRatingBody;
  findRunningRun?: (workId: string) => Promise<Pick<WorkRatingRun, "id"> | null>;
  runner?: SingleRatingRunner;
  workId: string;
};

export async function parseSingleRatingBody(request: Request): Promise<SingleRatingBody> {
  return request.json().catch(() => ({})) as Promise<SingleRatingBody>;
}

export async function executeSingleRatingRequest({
  body,
  findRunningRun = findRunningRatingRun,
  runner = runOpenAIRating,
  workId,
}: ExecuteOptions) {
  return executeSingleRatingRequestCore({ body, findRunningRun, runner, workId });
}

export async function handleSingleRatingRunRequest(request: Request, workId: string) {
  return executeSingleRatingRequest({
    body: await parseSingleRatingBody(request),
    workId,
  });
}

async function findRunningRatingRun(workId: string) {
  return prisma.workRatingRun.findFirst({
    where: { workId, status: "running" },
    select: { id: true },
  });
}

export const singleRatingErrorsForTest = {
  createRatingRequestError,
};
