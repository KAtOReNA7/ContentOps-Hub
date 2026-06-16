export type RatingErrorCode =
  | "COST_CONFIRMATION_REQUIRED"
  | "OPENAI_AUTH_ERROR"
  | "OPENAI_INVALID_RESPONSE"
  | "OPENAI_NETWORK_ERROR"
  | "OPENAI_NOT_CONFIGURED"
  | "OPENAI_RATE_LIMITED"
  | "OPENAI_TIMEOUT"
  | "OPENAI_UPSTREAM_ERROR"
  | "RATING_ALREADY_RUNNING";

export type NormalizedRatingError = {
  code: RatingErrorCode;
  userMessage: string;
  hint: string;
  httpStatus: number;
  runStatus: "failed" | "invalid";
};

export class RatingRequestError extends Error {
  readonly code: RatingErrorCode;
  readonly hint: string;
  readonly httpStatus: number;
  readonly runStatus: "failed" | "invalid";

  constructor(error: NormalizedRatingError) {
    super(error.userMessage);
    this.name = "RatingRequestError";
    this.code = error.code;
    this.hint = error.hint;
    this.httpStatus = error.httpStatus;
    this.runStatus = error.runStatus;
  }
}

export function createRatingRequestError(error: NormalizedRatingError) {
  return new RatingRequestError(error);
}

export function normalizeRatingError(error: unknown): NormalizedRatingError {
  if (error instanceof RatingRequestError) {
    return {
      code: error.code,
      userMessage: error.message,
      hint: error.hint,
      httpStatus: error.httpStatus,
      runStatus: error.runStatus,
    };
  }

  const message = safeErrorText(error);
  const status = statusCodeOf(error);

  if (/OPENAI_API_KEY|OPENAI_RATING_MODEL|OPENAI_TEXT_MODEL|配置缺失|required for OpenAI requests|OPENAI_BASE_URL|OPENAI_PROXY_URL/i.test(message)) {
    return {
      code: "OPENAI_NOT_CONFIGURED",
      userMessage: "OpenAI 评级配置不可用，本次没有产生有效评级。",
      hint: "请到设置页检查服务端 OpenAI API Key、模型名、Base URL 或代理配置，修正后可重新评级。",
      httpStatus: 503,
      runStatus: "failed",
    };
  }

  if (/timed out|timeout|aborted|超时/i.test(message)) {
    return {
      code: "OPENAI_TIMEOUT",
      userMessage: "OpenAI 评级请求超时，本次没有产生有效评级。",
      hint: "请稍后重试，或检查网络、代理和中转站响应速度；已有评级结果会继续保留。",
      httpStatus: 504,
      runStatus: "failed",
    };
  }

  if (/Connection error|fetch failed|ECONN|ENOTFOUND|EAI_AGAIN|network|socket|proxy|DNS|连接|网络/i.test(message)) {
    return {
      code: "OPENAI_NETWORK_ERROR",
      userMessage: "OpenAI 评级请求连接失败，本次没有产生有效评级。",
      hint: "请检查网络、代理或中转站连通性后重试；已有评级结果会继续保留。",
      httpStatus: 502,
      runStatus: "failed",
    };
  }

  if (status === 401 || status === 403) {
    return {
      code: "OPENAI_AUTH_ERROR",
      userMessage: "OpenAI 鉴权失败，本次没有产生有效评级。",
      hint: "请检查 API Key 权限、额度或中转站账号状态；系统不会展示密钥内容。",
      httpStatus: 502,
      runStatus: "failed",
    };
  }

  if (status === 429) {
    return {
      code: "OPENAI_RATE_LIMITED",
      userMessage: "OpenAI 请求被限流，本次没有产生有效评级。",
      hint: "请稍后重试，或降低调用频率；已有评级结果会继续保留。",
      httpStatus: 429,
      runStatus: "failed",
    };
  }

  if (typeof status === "number" && status >= 500) {
    return {
      code: "OPENAI_UPSTREAM_ERROR",
      userMessage: "OpenAI 上游服务暂时异常，本次没有产生有效评级。",
      hint: "请稍后重试，或检查中转站服务状态；已有评级结果会继续保留。",
      httpStatus: 502,
      runStatus: "failed",
    };
  }

  if (/结构校验|JSON schema|不是有效 JSON|响应为空|评级响应|invalid response|Unexpected token|JSON/i.test(message)) {
    return {
      code: "OPENAI_INVALID_RESPONSE",
      userMessage: "OpenAI 返回的评级结果格式不完整，系统未采用该结果。",
      hint: "可以更换模型或稍后重试；已有评级结果会继续保留。",
      httpStatus: 422,
      runStatus: "invalid",
    };
  }

  return {
    code: "OPENAI_UPSTREAM_ERROR",
    userMessage: "OpenAI 评级未完成，本次没有产生有效评级。",
    hint: "请稍后重试，或补充人工证据后重新评级；已有评级结果会继续保留。",
    httpStatus: 502,
    runStatus: "failed",
  };
}

export function ratingErrorResponse(error: NormalizedRatingError) {
  return {
    success: false,
    message: error.userMessage,
    code: error.code,
    errors: [error.userMessage],
    error: {
      code: error.code,
      message: error.userMessage,
      hint: error.hint,
    },
  };
}

function safeErrorText(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error || "");
  return raw
    .replace(/sk-[A-Za-z0-9_-]+/g, "[redacted-api-key]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]")
    .slice(0, 500);
}

function statusCodeOf(error: unknown) {
  if (!isRecord(error)) return null;
  const value = error.status ?? error.statusCode ?? error.code;
  if (typeof value === "number") return value;
  if (typeof value === "string" && /^\d{3}$/.test(value)) return Number(value);
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
