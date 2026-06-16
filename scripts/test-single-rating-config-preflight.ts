// @ts-expect-error Node strip-types runtime requires the explicit TypeScript extension.
import { validateOpenAIRatingConfig } from "../src/lib/rating/openai-rating-config.ts";
// @ts-expect-error Node strip-types runtime requires the explicit TypeScript extension.
import { ratingHistoryReadErrorResponse } from "../src/lib/rating/rating-errors.ts";
// @ts-expect-error Node strip-types runtime requires the explicit TypeScript extension.
import { executeSingleRatingRequestCore, resetSingleRatingLocksForTest } from "../src/lib/rating/single-rating-request-core.ts";

const missingKey = await runWithEnv({ OPENAI_API_KEY: "", OPENAI_RATING_MODEL: "rating-model" });
assert(missingKey.status === 503, "Missing API key should return 503.");
assert(errorCode(missingKey.body) === "OPENAI_NOT_CONFIGURED", "Missing API key should return OPENAI_NOT_CONFIGURED.");

const missingModel = await runWithEnv({ OPENAI_API_KEY: "test-key", OPENAI_RATING_MODEL: "", OPENAI_TEXT_MODEL: "" });
assert(missingModel.status === 503, "Missing model should return 503.");
assert(errorCode(missingModel.body) === "OPENAI_NOT_CONFIGURED", "Missing model should return OPENAI_NOT_CONFIGURED.");

const invalidBaseURL = await runWithEnv({
  OPENAI_API_KEY: "test-key",
  OPENAI_BASE_URL: "not a valid url",
  OPENAI_RATING_MODEL: "rating-model",
});
assert(invalidBaseURL.status === 503, "Invalid Base URL should return 503.");
assert(errorCode(invalidBaseURL.body) === "OPENAI_NOT_CONFIGURED", "Invalid Base URL should return OPENAI_NOT_CONFIGURED.");

const endpointBaseURL = await runWithEnv({
  OPENAI_API_KEY: "test-key",
  OPENAI_BASE_URL: "https://relay.example/v1/chat/completions",
  OPENAI_RATING_MODEL: "rating-model",
});
assert(endpointBaseURL.status === 503, "Endpoint Base URL should return 503.");
assert(errorCode(endpointBaseURL.body) === "OPENAI_NOT_CONFIGURED", "Endpoint Base URL should return OPENAI_NOT_CONFIGURED.");

const completeConfig = await runWithEnv({
  OPENAI_API_KEY: "test-key",
  OPENAI_BASE_URL: "https://relay.example/v1",
  OPENAI_RATING_MODEL: "rating-model",
});
assert(completeConfig.status === 200, "Complete config should pass preflight and run.");

const officialDefaultBaseURL = await runWithEnv({
  OPENAI_API_KEY: "test-key",
  OPENAI_BASE_URL: "",
  OPENAI_RATING_MODEL: "rating-model",
});
assert(officialDefaultBaseURL.status === 200, "Missing Base URL should be allowed for official SDK default.");

const safeGetError = ratingHistoryReadErrorResponse();
const safeGetText = JSON.stringify(safeGetError);
for (const sensitive of [
  "C:\\\\Users\\\\DELL\\\\project\\\\db.sqlite",
  "DATABASE_URL",
  "sk-secret-value",
  "Bearer secret-token",
]) {
  assert(!safeGetText.includes(sensitive), `GET history error response leaked ${sensitive}.`);
}

console.log("Single rating config preflight tests passed.");

async function runWithEnv(env: Record<string, string>) {
  resetSingleRatingLocksForTest();
  let runnerCalls = 0;
  const result = await executeSingleRatingRequestCore({
    body: { costConfirmed: true },
    findRunningRun: async () => null,
    preflight: () => validateOpenAIRatingConfig(env),
    runner: async () => {
      runnerCalls += 1;
      return { id: "run" };
    },
    workId: `work-${Math.random()}`,
  });
  if (result.status !== 200) assert(runnerCalls === 0, "Invalid config must not call provider or create a run.");
  if (result.status === 200) assert(runnerCalls === 1, "Complete config should call provider exactly once.");
  assert(!safeResponseText(result.body).includes("test-key"), "Response must not expose config values.");
  assert(!safeResponseText(result.body).includes("relay.example/v1/chat/completions"), "Response must not expose full Base URL.");
  return result;
}

function safeResponseText(value: unknown) {
  return JSON.stringify(value);
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function errorCode(value: unknown) {
  return typeof value === "object" && value !== null && "code" in value ? String(value.code) : "";
}

