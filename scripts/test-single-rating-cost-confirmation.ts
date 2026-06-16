// @ts-expect-error Node strip-types runtime requires the explicit TypeScript extension.
import { executeSingleRatingRequestCore } from "../src/lib/rating/single-rating-request-core.ts";
// @ts-expect-error Node strip-types runtime requires the explicit TypeScript extension.
import { normalizeRatingError } from "../src/lib/rating/rating-errors.ts";

let runnerCalls = 0;
let runningChecks = 0;

for (const endpoint of ["run", "rerun", "compat-rating-post"]) {
  runnerCalls = 0;
  runningChecks = 0;
  const result = await executeSingleRatingRequestCore({
    body: { provider: "openai" },
    findRunningRun: async () => {
      runningChecks += 1;
      return null;
    },
    runner: async () => {
      runnerCalls += 1;
      return { id: "should-not-run" };
    },
    workId: `work-${endpoint}`,
  });
  assert(result.status === 400, `${endpoint}: missing confirmation must return 400.`);
  assert(errorCode(result.body) === "COST_CONFIRMATION_REQUIRED", `${endpoint}: missing confirmation must return stable error code.`);
  assert(runnerCalls === 0, `${endpoint}: provider must not be called before cost confirmation.`);
  assert(runningChecks === 0, `${endpoint}: running check should not happen before cost confirmation.`);
}

runnerCalls = 0;
const success = await executeSingleRatingRequestCore({
  body: { costConfirmed: true, provider: "openai" },
  findRunningRun: async () => null,
  runner: async (_workId, options) => {
    runnerCalls += 1;
    assert(options.adoptResult !== true, "Adopt result should default to false.");
    return { id: "run-success", status: "success" };
  },
  workId: "work-success",
});
assert(success.status === 200, "Confirmed request should succeed with stub provider.");
assert(success.body.success === true, "Confirmed request should return success.");
assert(runnerCalls === 1, "Confirmed request should call provider exactly once.");

runnerCalls = 0;
const running = await executeSingleRatingRequestCore({
  body: { costConfirmed: true, provider: "openai" },
  findRunningRun: async () => ({ id: "running-run" }),
  runner: async () => {
    runnerCalls += 1;
    return { id: "should-not-run" };
  },
  workId: "work-running",
});
assert(running.status === 409, "Existing running rating must return 409.");
assert(errorCode(running.body) === "RATING_ALREADY_RUNNING", "Existing running rating must return stable error code.");
assert(runnerCalls === 0, "Provider must not be called when a run is already running.");

const cases: Array<{ code: string; error: unknown; status?: number }> = [
  { code: "OPENAI_NOT_CONFIGURED", error: new Error("OPENAI_API_KEY is required for OpenAI requests.") },
  { code: "OPENAI_TIMEOUT", error: new Error("Request timed out after 90000ms") },
  { code: "OPENAI_NETWORK_ERROR", error: new Error("Connection error: fetch failed") },
  { code: "OPENAI_AUTH_ERROR", error: Object.assign(new Error("401 bad key sk-secret-value"), { status: 401 }) },
  { code: "OPENAI_RATE_LIMITED", error: Object.assign(new Error("too many requests"), { status: 429 }), status: 429 },
  { code: "OPENAI_UPSTREAM_ERROR", error: Object.assign(new Error("upstream crashed with Authorization: Bearer secret"), { status: 500 }) },
  { code: "OPENAI_INVALID_RESPONSE", error: new Error("OpenAI 评级响应不是有效 JSON：Unexpected token") },
];

for (const item of cases) {
  const normalized = normalizeRatingError(item.error);
  assert(normalized.code === item.code, `Expected ${item.code}, got ${normalized.code}.`);
  assert(!/sk-secret|Bearer secret|Authorization/i.test(JSON.stringify(normalized)), `${item.code}: normalized error leaked sensitive text.`);
  if (item.code === "OPENAI_INVALID_RESPONSE") assert(normalized.runStatus === "invalid", "Invalid response must map to invalid run status.");
  else assert(normalized.runStatus === "failed", `${item.code}: non-schema OpenAI errors must map to failed run status.`);
}

const failed = await executeSingleRatingRequestCore({
  body: { costConfirmed: true, provider: "openai" },
  findRunningRun: async () => null,
  runner: async () => {
    throw Object.assign(new Error("401 bad key sk-secret-value"), { status: 401 });
  },
  workId: "work-auth-error",
});
assert(failed.status === 502, "Auth errors should return a safe upstream status.");
assert(errorCode(failed.body) === "OPENAI_AUTH_ERROR", "Auth errors should return stable code.");
assert(!JSON.stringify(failed.body).includes("sk-secret-value"), "API payload must not leak API key.");

console.log("Single rating cost confirmation tests passed.");

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function errorCode(value: unknown) {
  return typeof value === "object" && value !== null && "code" in value ? String(value.code) : "";
}
