// @ts-expect-error Node strip-types tests require the explicit TypeScript extension.
import { createRatingRequestError } from "./rating-errors.ts";

type OpenAIRatingEnv = Record<string, string | undefined>;

const invalidBaseURLPathHints = [
  "/chat/completions",
  "/responses",
  "/images/generations",
  "/images/edits",
];

export function validateOpenAIRatingConfig(env: OpenAIRatingEnv = process.env) {
  const apiKey = env.OPENAI_API_KEY?.trim();
  const model = (env.OPENAI_RATING_MODEL || env.OPENAI_TEXT_MODEL)?.trim();
  const baseURL = env.OPENAI_BASE_URL?.trim();

  if (!apiKey || !model || !isValidBaseURL(baseURL)) {
    throw createRatingRequestError({
      code: "OPENAI_NOT_CONFIGURED",
      userMessage: "OpenAI 评级配置不可用，本次没有创建评级运行记录。",
      hint: "请到设置页检查 OpenAI API Key、评级模型名和 Base URL；Base URL 可留空使用官方默认地址。",
      httpStatus: 503,
      runStatus: "failed",
    });
  }
}

function isValidBaseURL(baseURL: string | undefined) {
  if (!baseURL) return true;

  let parsed: URL;
  try {
    parsed = new URL(baseURL);
  } catch {
    return false;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;

  const normalizedPath = parsed.pathname.replace(/\/+$/u, "").toLowerCase();
  return !invalidBaseURLPathHints.some((pathHint) => normalizedPath.endsWith(pathHint));
}
