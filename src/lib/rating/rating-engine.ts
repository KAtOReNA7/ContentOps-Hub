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

  addIdentificationReliability(identificationConfidence, input, risks, evidence);
  score += scoreTitle(title, reasons, risks, evidence);
  score += scoreIntro(intro, reasons, risks, evidence);
  score += scoreCategory(category, title, intro, reasons, evidence);
  score += scoreSearchEvidence(input, reasons, risks, evidence);
  score += scoreMetrics(input, reasons, risks, evidence);
  score += scoreDuplicateRisk(input, risks, evidence);

  const cappedScore = clampScore(score);
  const rating = ratingFromScore(cappedScore);
  const confidence = calculateRatingConfidence(identificationConfidence, input, risks);
  const renameSuggestion = suggestRename(rating, cappedScore, title, category, risks);

  return {
    rating,
    score: cappedScore,
    confidence,
    reasons: sortRatingMessages(reasons),
    risks: sortRatingMessages(Array.from(new Set(risks))),
    evidence: sortRatingMessages(evidence),
    renameSuggestion,
    renameReason: renameReason(renameSuggestion, rating, title, category, risks),
  };
}

function addIdentificationReliability(
  confidence: number,
  input: RatingInput,
  risks: string[],
  evidence: string[],
): void {
  if (!input.identification) {
    risks.push("尚未进行作品识别，当前结果为预评级");
    evidence.push("识别置信度不参与作品价值打分，仅用于判断评级可信度");
    return;
  }

  evidence.push(`识别置信度：${Math.round(confidence * 100)}%，仅用于判断评级可信度，不直接加减作品价值分`);

  if (input.identification.confirmed) {
    evidence.push("作品身份已人工确认，评级可作为正式运营参考");
    return;
  }

  if (confidence < 0.35) {
    risks.push("识别置信度极低且未人工确认：当前为预评级，不建议直接用于运营决策");
    return;
  }

  if (confidence < 0.7) {
    risks.push("识别置信度较低，建议人工确认后再进入正式评级");
  }
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

function scoreSearchEvidence(
  input: RatingInput,
  reasons: string[],
  risks: string[],
  evidence: string[],
): number {
  const summary = input.identification?.sourceSummary;
  const candidates = input.identification?.candidates ?? [];
  const ipEvidence = [
    ...(summary?.ipEvidence ?? []),
    ...candidates.flatMap((candidate) => candidate.ipEvidence ?? []),
  ];
  const heatEvidence = [
    ...(summary?.heatEvidence ?? []),
    ...candidates.flatMap((candidate) => candidate.heatEvidence ?? []),
  ];
  const platformSummary = summary?.platformSummary ?? summarizeCandidatePlatforms(candidates);
  let score = 0;

  if (!summary && candidates.length === 0) {
    evidence.push("暂无搜索证据，平台来源权重未参与评分");
    return 0;
  }

  const audioPlatforms = platformSummary.filter((item) => item.sourceCategory === "audio_platform");
  const ebookPlatforms = platformSummary.filter((item) => item.sourceCategory === "ebook_platform");
  const videoPlatforms = platformSummary.filter((item) => item.sourceCategory === "video_platform");
  const heatPlatforms = platformSummary.filter((item) =>
    ["social_media", "encyclopedia", "news"].includes(item.sourceCategory),
  );

  if (audioPlatforms.length) {
    reasons.push("存在有声书平台搜索证据");
    evidence.push(`有声书平台证据：${audioPlatforms.map((item) => `${item.canonicalSourceName} ${item.resultCount} 条`).join("；")}`);
    score += 8;
  }

  if (ebookPlatforms.length) {
    reasons.push("存在电子书平台证据");
    evidence.push(`原作平台证据：${ebookPlatforms.map((item) => `${item.canonicalSourceName} ${item.resultCount} 条`).join("；")}`);
    score += Math.min(10, 4 + ebookPlatforms.length * 2);
  }

  if (!audioPlatforms.length && !ebookPlatforms.length) {
    evidence.push("搜索证据主要来自搜索引擎、社交媒体或未知来源，仅作辅助参考");
    score += 1;
  }

  if (videoPlatforms.length || ipEvidence.length) {
    const highCount = ipEvidence.filter((item) => item.confidence === "high").length;
    const mediumCount = ipEvidence.filter((item) => item.confidence === "medium").length;
    const ipScore = highCount ? 16 : mediumCount ? 8 : videoPlatforms.length ? 12 : 0;

    reasons.push("存在影视化 / IP 改编证据");
    evidence.push("存在影视化 / IP 改编证据，提升作品商业价值判断。");
    if (videoPlatforms.length) {
      evidence.push(`影视/IP 平台证据：${videoPlatforms.map((item) => `${item.canonicalSourceName} ${item.resultCount} 条`).join("；")}`);
    }
    if (ipEvidence.length) {
      evidence.push(`IP 证据摘要：${dedupeText(ipEvidence.map((item) => `${item.sourceName}：${item.evidenceText}`)).slice(0, 4).join("；")}`);
    }
    score += ipScore;
  }

  if (heatPlatforms.length || heatEvidence.length) {
    const uniqueHeatPlatformCount = new Set([
      ...heatPlatforms.map((item) => item.canonicalSourceName),
      ...heatEvidence.map((item) => item.sourceName),
    ]).size;
    const heatScore = Math.min(10, uniqueHeatPlatformCount * 3 + (heatEvidence.some((item) => item.strength === "high") ? 3 : 0));

    reasons.push("存在全网热度辅助证据");
    evidence.push(`全网热度证据覆盖 ${uniqueHeatPlatformCount} 个平台，按平台去重计分。`);
    if (heatEvidence.length) {
      evidence.push(`热度证据摘要：${dedupeText(heatEvidence.map((item) => `${item.sourceName}：${item.evidenceText}`)).slice(0, 4).join("；")}`);
    }
    score += heatScore;
  }

  if ((summary?.authorMatchCount ?? 0) > 0) {
    reasons.push("搜索证据中出现作者匹配");
    evidence.push(`作者匹配证据数量：${summary?.authorMatchCount ?? 0}`);
    score += 5;
  } else if (input.work.author) {
    risks.push("搜索证据中作者匹配不足");
  }

  return score;
}

function summarizeCandidatePlatforms(candidates: NonNullable<RatingInput["identification"]>["candidates"]) {
  const map = new Map<string, { canonicalSourceName: string; sourceCategory: string; resultCount: number }>();

  for (const candidate of candidates) {
    const canonicalSourceName = candidate.canonicalSourceName || candidate.sourceName || candidate.platform;
    const sourceCategory = candidate.sourceCategory || candidate.sourceType || "unknown";
    const key = `${canonicalSourceName}-${sourceCategory}`;
    const current = map.get(key);

    if (current) {
      current.resultCount += 1;
    } else {
      map.set(key, { canonicalSourceName, sourceCategory, resultCount: 1 });
    }
  }

  return Array.from(map.values());
}

function dedupeText(items: string[]): string[] {
  return Array.from(new Set(items.filter(Boolean)));
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
  const identityConfidence = input.identification?.confirmed ? 0.75 : confidence * 0.45;
  const sourceConfidence = input.identification?.sourceSummary?.audioPlatformCount ? 0.15 : 0.05;
  const base = identityConfidence + sourceConfidence + (hasMetrics ? 0.15 : 0.05) + (risks.length > 2 ? 0 : 0.05);
  return Math.round(clamp01(base) * 100) / 100;
}

function suggestRename(
  rating: WorkRating,
  score: number,
  title: string,
  category: string,
  risks: string[],
): RenameSuggestion {
  if (risks.some((risk) => risk.includes("识别置信度") && risk.includes("人工确认"))) return "cautious";
  if (rating === "S") return "avoid";
  if (rating === "A") return "cautious";
  if (rating === "B") return "recommended";
  if (rating === "C") {
    return includesAny(`${title} ${category}`, [...identityReverseWords, ...hookWords])
      ? "strongly_recommended"
      : "recommended";
  }
  if (risks.some((risk) => risk.includes("识别置信度极低"))) return "cautious";
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
    return rating === "S" || rating === "A"
      ? "作品认知度或综合评分较高，不建议轻易改名。"
      : `投入产出不明，需先处理风险：${risks.join("；") || "信息不足"}`;
  }
  if (suggestion === "cautious") {
    return risks.some((risk) => risk.includes("识别"))
      ? "识别风险仍需人工确认，确认前只建议谨慎小范围测试。"
      : "可小范围测试包装优化，但不建议大幅偏离原作认知。";
  }
  if (suggestion === "recommended") {
    return "作品具备一定卖点，且包装仍有优化空间，适合通过多书名测试提升点击。";
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

function sortRatingMessages(items: string[]): string[] {
  return items
    .map((text, index) => ({ text, index, weight: messageWeight(text) }))
    .sort((left, right) => right.weight - left.weight || left.index - right.index)
    .map((item) => item.text);
}

function messageWeight(text: string): number {
  if (/影视化|IP|改编|原作平台|晋江|起点|有声书平台|重名|误识别|极低/.test(text)) return 100;
  if (/全网热度|作者匹配|搜索证据|播放量|点击率|完播率|置信度较低/.test(text)) return 70;
  if (/书名|简介|题材|分类|长度|关键词/.test(text)) return 40;
  return 20;
}
