import type { RatingInput, RatingResult, RenameSuggestion, WorkRating } from "@/lib/rating/rating-types";

const strongEmotionWords = ["离婚", "复仇", "求复合", "逆袭", "翻身", "打脸", "追妻", "崛起", "归来", "不忍了"];
const conflictWords = ["冲突", "误会", "背叛", "陷害", "夺回", "争夺", "复仇", "对抗", "危机"];
const identityReverseWords = ["重生", "穿越", "赘婿", "战神", "神医", "千金", "侯府", "小祖宗", "归来"];
const hookWords = ["爽", "逆袭", "玄学", "修仙", "悬疑", "灵异", "年代", "种田", "言情", "总裁"];

const categoryBaseScores: Array<{ keywords: string[]; score: number; label: string }> = [
  { keywords: ["重生", "穿越", "赘婿", "神医", "战神"], score: 14, label: "强爽点题材" },
  { keywords: ["悬疑", "灵异", "玄幻", "修仙"], score: 12, label: "高钩子题材" },
  { keywords: ["都市", "言情", "总裁", "追妻"], score: 10, label: "泛用户题材" },
  { keywords: ["年代", "种田"], score: 8, label: "稳定垂类题材" },
];

export function evaluateWorkRating(input: RatingInput): RatingResult {
  const reasons: string[] = [];
  const risks: string[] = [];
  const evidence: string[] = [];
  let score = 35;

  const title = normalize(input.work.title);
  const intro = normalize(input.work.intro);
  const category = normalize(input.work.category);
  const identificationConfidence = clamp01((input.identification?.confidence ?? 0) / 100);

  score += scoreIdentification(identificationConfidence, input, reasons, risks, evidence);
  score += scoreTitle(title, reasons, risks, evidence);
  score += scoreIntro(intro, reasons, risks, evidence);
  score += scoreCategory(category, title, intro, reasons, evidence);
  score += scoreMetrics(input, reasons, risks, evidence);
  score += scoreDuplicateRisk(input, risks, evidence);

  const cappedScore = applyLowConfidenceCap(clampScore(score), identificationConfidence, risks);
  const rating = ratingFromScore(cappedScore);
  const confidence = calculateRatingConfidence(identificationConfidence, input, risks);
  const renameSuggestion = suggestRename(rating, cappedScore, title, category, risks);

  return {
    rating,
    score: cappedScore,
    confidence,
    reasons,
    risks: Array.from(new Set(risks)),
    evidence,
    renameSuggestion,
    renameReason: renameReason(renameSuggestion, rating, title, category, risks),
  };
}

function scoreIdentification(
  confidence: number,
  input: RatingInput,
  reasons: string[],
  risks: string[],
  evidence: string[],
): number {
  if (!input.identification) {
    risks.push("缺少作品识别结果");
    evidence.push("未提供 identification，评级置信度降低");
    return -10;
  }

  evidence.push(`识别置信度：${Math.round(confidence * 100)}%`);

  if (confidence >= 0.85) {
    reasons.push("作品识别置信度高");
    return 15;
  }

  if (confidence >= 0.65) {
    reasons.push("作品识别置信度中等");
    return 8;
  }

  if (confidence >= 0.4) {
    risks.push("作品识别置信度偏低");
    return -4;
  }

  risks.push("作品识别置信度很低");
  return -14;
}

function scoreTitle(
  title: string,
  reasons: string[],
  risks: string[],
  evidence: string[],
): number {
  if (!title) {
    risks.push("书名缺失");
    return -12;
  }

  let score = 0;
  const matchedEmotion = includesAny(title, strongEmotionWords);
  const matchedConflict = includesAny(title, conflictWords);
  const matchedIdentity = includesAny(title, identityReverseWords);
  const matchedHook = includesAny(title, hookWords);

  if (matchedEmotion) {
    reasons.push("书名具备强情绪词");
    score += 8;
  }
  if (matchedConflict) {
    reasons.push("书名体现冲突");
    score += 6;
  }
  if (matchedIdentity) {
    reasons.push("书名体现身份反转或设定钩子");
    score += 7;
  }
  if (matchedHook) {
    reasons.push("书名体现题材爽点");
    score += 5;
  }

  if (title.length <= 4 && score < 8) {
    risks.push("书名偏短且卖点不明确");
    score -= 5;
  }
  if (score <= 2) {
    risks.push("书名商业吸引力偏弱");
    evidence.push("书名未命中明显强情绪、冲突或爽点词");
    score -= 4;
  }

  return score;
}

function scoreIntro(
  intro: string,
  reasons: string[],
  risks: string[],
  evidence: string[],
): number {
  if (!intro) {
    risks.push("简介缺失");
    return -12;
  }

  let score = 0;

  if (intro.length < 30) {
    risks.push("简介过短，信息密度不足");
    score -= 5;
  } else {
    evidence.push("简介长度基本可用");
    score += 3;
  }

  if (includesAny(intro, ["女主", "男主", "主角", "她", "他"])) {
    reasons.push("简介包含主角信息");
    score += 4;
  }
  if (includesAny(intro, conflictWords)) {
    reasons.push("简介包含冲突信息");
    score += 5;
  }
  if (includesAny(intro, ["目标", "夺回", "查明", "复仇", "成长", "逆袭", "破局"])) {
    reasons.push("简介包含目标或行动方向");
    score += 5;
  }
  if (includesAny(intro, ["秘密", "真相", "身世", "悬念", "危机", "线索"])) {
    reasons.push("简介包含悬念信息");
    score += 4;
  }

  if (score <= 3) {
    risks.push("简介卖点提炼不足");
  }

  return score;
}

function scoreCategory(
  category: string,
  title: string,
  intro: string,
  reasons: string[],
  evidence: string[],
): number {
  const haystack = `${category} ${title} ${intro}`;
  const matched = categoryBaseScores.find((item) => includesAny(haystack, item.keywords));

  if (!matched) {
    evidence.push("题材商业性信息不足");
    return 0;
  }

  reasons.push(`题材具备商业性：${matched.label}`);
  evidence.push(`命中题材关键词：${matched.keywords.filter((keyword) => haystack.includes(keyword)).join("、")}`);
  return matched.score;
}

function scoreMetrics(
  input: RatingInput,
  reasons: string[],
  risks: string[],
  evidence: string[],
): number {
  const { playCount, clickRate, completionRate } = input.work;
  let score = 0;

  if (playCount === null || playCount === undefined) {
    evidence.push("播放量缺失");
  } else if (playCount >= 100000) {
    reasons.push("播放量表现较强");
    score += 8;
  } else if (playCount >= 20000) {
    reasons.push("播放量有一定基础");
    score += 4;
  } else {
    risks.push("播放量基础较弱");
    score -= 2;
  }

  if (clickRate === null || clickRate === undefined) {
    evidence.push("点击率缺失");
  } else if (clickRate >= 0.12) {
    reasons.push("点击率表现较好");
    score += 6;
  } else if (clickRate >= 0.06) {
    reasons.push("点击率中等");
    score += 2;
  } else {
    risks.push("点击率偏低");
    score -= 4;
  }

  if (completionRate === null || completionRate === undefined) {
    evidence.push("完播率缺失");
  } else if (completionRate >= 0.35) {
    reasons.push("完播率表现较好");
    score += 6;
  } else if (completionRate >= 0.2) {
    reasons.push("完播率中等");
    score += 2;
  } else {
    risks.push("完播率偏低");
    score -= 4;
  }

  return score;
}

function scoreDuplicateRisk(input: RatingInput, risks: string[], evidence: string[]): number {
  const hasRiskText = input.identification?.risks.some((risk) => risk.includes("重名") || risk.includes("误识别"));
  const hasCandidateRisk = input.identification?.candidates.some((candidate) => candidate.possibleDuplicate);

  if (hasRiskText || hasCandidateRisk) {
    risks.push("存在重名或误识别风险");
    evidence.push("识别候选或风险项提示疑似重名");
    return -10;
  }

  return 0;
}

function applyLowConfidenceCap(score: number, confidence: number, risks: string[]): number {
  if (confidence < 0.25) {
    risks.push("识别置信度极低，评级最高限制为 D");
    return Math.min(score, 39);
  }

  if (confidence < 0.45) {
    risks.push("识别置信度较低，评级最高限制为 C");
    return Math.min(score, 54);
  }

  return score;
}

function ratingFromScore(score: number): WorkRating {
  if (score >= 85) return "S";
  if (score >= 70) return "A";
  if (score >= 55) return "B";
  if (score >= 40) return "C";
  return "D";
}

function calculateRatingConfidence(confidence: number, input: RatingInput, risks: string[]): number {
  const hasMetrics = [input.work.playCount, input.work.clickRate, input.work.completionRate].some(
    (value) => value !== null && value !== undefined,
  );
  const base = confidence * 0.7 + (hasMetrics ? 0.2 : 0.08) + (risks.length > 2 ? 0 : 0.1);
  return Math.round(clamp01(base) * 100) / 100;
}

function suggestRename(
  rating: WorkRating,
  score: number,
  title: string,
  category: string,
  risks: string[],
): RenameSuggestion {
  if (rating === "S") return "avoid";
  if (rating === "A") return "cautious";
  if (rating === "B") return "recommended";
  if (rating === "C") {
    return includesAny(`${title} ${category}`, [...identityReverseWords, ...hookWords])
      ? "strongly_recommended"
      : "recommended";
  }
  if (risks.some((risk) => risk.includes("识别置信度极低"))) return "avoid";
  return score >= 35 && includesAny(category, hookWords) ? "recommended" : "cautious";
}

function renameReason(
  suggestion: RenameSuggestion,
  rating: WorkRating,
  title: string,
  category: string,
  risks: string[],
): string {
  if (suggestion === "avoid") {
    return rating === "S"
      ? "作品认知度或综合评分较高，不建议轻易改名。"
      : `投入产出不明，需先处理风险：${risks.join("；") || "信息不足"}`;
  }
  if (suggestion === "cautious") {
    return "可小范围测试包装优化，但不建议大幅偏离原作认知。";
  }
  if (suggestion === "recommended") {
    return "作品具备一定卖点，适合通过多书名测试提升点击。";
  }
  return `当前包装仍有明显优化空间，且题材/书名存在可提炼卖点：${title || category || "待补充"}`;
}

function normalize(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function includesAny(value: string, keywords: string[]): boolean {
  return keywords.some((keyword) => value.includes(keyword));
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}
