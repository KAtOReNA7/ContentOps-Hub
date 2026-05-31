const ratingInvalidMessages: Array<[RegExp, string]> = [
  [/平台集团关系|爱奇艺文学|腾讯动漫|网易云音乐/, "本次评级结果未被采用：模型疑似将平台名称或集团关系误判为影视、IP 或热度证据。"],
  [/IP 改编判断|社媒热度判断|作者影响力判断/, "本次评级结果未被采用：模型将缺少明确原始依据的信号当成了已确认事实。"],
  [/封面评分|封面质量/, "本次评级结果未被采用：模型将封面质量作为作品价值减分项，这不符合当前评级规则。"],
  [/缺失证据|缺少音频|音频平台数据/, "本次评级结果未被采用：模型将缺失数据作为减分项，这不符合当前评级规则。"],
  [/外部搜索作者差异|作者差异|作者不一致|作者不匹配/, "本次评级结果未被采用：模型将外部搜索作者差异作为作品价值减分项。作者差异只能用于过滤搜索结果。"],
  [/盗版|采集|侵权聚合|Tier 0/, "本次评级结果未被采用：模型引用了盗版、采集或低可信来源。"],
  [/已过滤|rejected|不确定的搜索结果/, "本次评级结果未被采用：模型引用了已过滤或不确定的搜索结果。"],
  [/acceptedEvidence 引用了不可参与评级|sameWorkDecision=rejected|sameWorkDecision=uncertain/, "本次评级结果未被采用：模型将已拒绝或不确定的搜索结果作为正式证据。"],
  [/evidenceTags|hasPrimaryPlatformEvidence|hasTrustedThirdPartyEvidence|hasAudioEvidence/, "本次评级结果未被采用：模型输出的证据标签缺少已采信证据支撑。"],
  [/普通低权重网页|低权重网页/, "本次评级结果未被采用：模型过度依赖低可信普通网页，未优先使用可信来源。"],
  [/结构校验|JSON schema|不是有效 JSON|响应为空/, "本次 OpenAI 评级结果格式不完整，系统未采用该结果。"],
];

export function mapRatingInvalidReasonToUserMessage(reason: string): string {
  const matched = ratingInvalidMessages.find(([pattern]) => pattern.test(reason));
  return matched?.[1] ?? "本次 OpenAI 评级结果未被采用：模型将不可靠证据作为核心依据。";
}

export function mapRatingFailureToUserMessage(error: unknown): string {
  const reason = error instanceof Error ? error.message : String(error || "");

  if (/当前已采用评级不会被覆盖/.test(reason)) {
    return reason;
  }
  if (/OpenAI 评级结果无效/.test(reason)) {
    return mapRatingInvalidReasonToUserMessage(reason);
  }
  if (/OPENAI_API_KEY|OPENAI_RATING_MODEL|OPENAI_TEXT_MODEL|配置缺失/.test(reason)) {
    return "OpenAI 评级配置缺失，请联系系统管理员检查服务端模型和密钥配置。";
  }
  if (/timed out|timeout|超时/i.test(reason)) {
    return "OpenAI 评级请求超时，请稍后重试；当前已采用评级不会被覆盖。";
  }
  if (/Connection error|fetch failed|网络|ECONN/i.test(reason)) {
    return "OpenAI 评级请求连接失败，请检查网络或代理后重试；当前已采用评级不会被覆盖。";
  }
  if (/结构校验|JSON schema|不是有效 JSON|响应为空/.test(reason)) {
    return "本次 OpenAI 评级结果格式不完整，系统未采用该结果。";
  }

  return "OpenAI 评级未完成，当前已采用评级不会被覆盖。请稍后重试，或补充人工证据后重新评级。";
}

export function appendRatingRecoveryHint(message: string): string {
  const preserveHint = "当前已采用评级不会被覆盖。";
  const retryHint = "可以重新生成评级，或补充人工证据后重新评级。";
  const preserveText = message.includes("当前已采用评级不会被覆盖") ? "" : ` ${preserveHint}`;
  const retryText = message.includes("补充人工证据后重新评级") ? "" : ` ${retryHint}`;
  return `${message}${preserveText}${retryText}`;
}
