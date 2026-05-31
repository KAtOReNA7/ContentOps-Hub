import { createRequire } from "node:module";
import type OpenAI from "openai";
import { z } from "zod";
import type { OpenAIRatingResult, RatingInput, RatingSupplementInput } from "@/lib/rating/rating-types";

const sourceTierSchema = z.enum(["tier1_primary", "tier2_trusted_distribution", "tier3_audio_drama", "tier4_social_ip", "tier5_low_weight", "tier0_filtered"]);
const sourceCategorySchema = z.enum(["primary_platform", "third_party_reading", "audio_platform", "audio_drama_platform", "social", "news", "encyclopedia", "piracy", "aggregator", "irrelevant", "other"]);
const evidenceTypeSchema = z.enum(["platform_presence", "ranking", "sales", "comments", "subscription", "author_profile", "ip_adaptation", "social_heat", "audio_performance", "publication", "review", "irrelevant", "other"]);
const ratingPayloadSchema = z.object({
  rating: z.enum(["S", "A", "B", "C", "D"]),
  score: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  renameSuggestion: z.enum(["avoid", "cautious", "recommended", "strongly_recommended"]),
  reasonSummary: z.string(),
  riskNotes: z.array(z.string()),
  keyEvidence: z.array(z.string()),
  evidenceWeighting: z.array(z.object({
    source: z.string(),
    type: z.enum(["platform", "ip", "social", "ranking", "sales", "author", "cover", "test", "manual", "other"]),
    importance: z.enum(["high", "medium", "low"]),
    effect: z.enum(["increase", "decrease", "neutral"]),
    reason: z.string(),
  }).strict()),
  missingEvidence: z.array(z.string()),
  operationAdvice: z.string(),
  titleOptimizationPotential: z.enum(["low", "medium", "high"]),
  coverOptimizationPotential: z.enum(["low", "medium", "high"]),
  hasIpAdaptationEvidence: z.boolean(),
  hasSocialHeatEvidence: z.boolean(),
  hasAuthorInfluenceEvidence: z.boolean(),
}).strict();
const ratingResultSchema = z.object({
  searchResultAnalysis: z.array(z.object({
    resultId: z.string(),
    sameWorkDecision: z.enum(["matched", "uncertain", "rejected"]),
    sameWorkProbability: z.number().min(0).max(1),
    sourceTier: sourceTierSchema,
    sourceCategory: sourceCategorySchema,
    evidenceType: evidenceTypeSchema,
    claimStrength: z.enum(["strong", "medium", "weak", "none"]),
    canAffectRating: z.boolean(),
    reason: z.string(),
    extractedClaims: z.array(z.string()),
  }).strict()),
  acceptedEvidence: z.array(z.object({
    resultId: z.string(), source: z.string(), sourceTier: sourceTierSchema, evidenceType: evidenceTypeSchema,
    claim: z.string(), effect: z.enum(["increase", "decrease", "neutral"]), importance: z.enum(["high", "medium", "low"]), reason: z.string(),
  }).strict()),
  uncertainEvidence: z.array(z.object({ resultId: z.string(), reason: z.string() }).strict()),
  rejectedEvidence: z.array(z.object({ resultId: z.string(), reason: z.string() }).strict()),
  missingEvidence: z.array(z.object({ type: z.string(), reason: z.string(), shouldPenalize: z.literal(false) }).strict()),
  evidenceTags: z.object({
    hasPrimaryPlatformEvidence: z.boolean(), primaryPlatforms: z.array(z.string()),
    hasTrustedThirdPartyEvidence: z.boolean(), trustedThirdPartyPlatforms: z.array(z.string()),
    hasAudioEvidence: z.boolean(), audioPlatforms: z.array(z.string()),
    hasSocialHeatEvidence: z.boolean(), socialHeatSources: z.array(z.string()),
    hasIpAdaptationEvidence: z.boolean(), ipAdaptationTypes: z.array(z.string()),
    hasAuthorInfluenceEvidence: z.boolean(), authorInfluenceSources: z.array(z.string()),
  }).strict(),
  ratingResult: ratingPayloadSchema,
}).strict();

const jsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["searchResultAnalysis", "acceptedEvidence", "uncertainEvidence", "rejectedEvidence", "missingEvidence", "evidenceTags", "ratingResult"],
  properties: {
    searchResultAnalysis: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        required: ["resultId", "sameWorkDecision", "sameWorkProbability", "sourceTier", "sourceCategory", "evidenceType", "claimStrength", "canAffectRating", "reason", "extractedClaims"],
        properties: { resultId: { type: "string" }, sameWorkDecision: { type: "string", enum: ["matched", "uncertain", "rejected"] }, sameWorkProbability: { type: "number", minimum: 0, maximum: 1 }, sourceTier: sourceTierJson(), sourceCategory: sourceCategoryJson(), evidenceType: evidenceTypeJson(), claimStrength: { type: "string", enum: ["strong", "medium", "weak", "none"] }, canAffectRating: { type: "boolean" }, reason: { type: "string" }, extractedClaims: stringArrayJson() },
      },
    },
    acceptedEvidence: { type: "array", items: { type: "object", additionalProperties: false, required: ["resultId", "source", "sourceTier", "evidenceType", "claim", "effect", "importance", "reason"], properties: { resultId: { type: "string" }, source: { type: "string" }, sourceTier: sourceTierJson(), evidenceType: evidenceTypeJson(), claim: { type: "string" }, effect: { type: "string", enum: ["increase", "decrease", "neutral"] }, importance: { type: "string", enum: ["high", "medium", "low"] }, reason: { type: "string" } } } },
    uncertainEvidence: partitionJson(),
    rejectedEvidence: partitionJson(),
    missingEvidence: { type: "array", items: { type: "object", additionalProperties: false, required: ["type", "reason", "shouldPenalize"], properties: { type: { type: "string" }, reason: { type: "string" }, shouldPenalize: { type: "boolean", enum: [false] } } } },
    evidenceTags: { type: "object", additionalProperties: false, required: ["hasPrimaryPlatformEvidence", "primaryPlatforms", "hasTrustedThirdPartyEvidence", "trustedThirdPartyPlatforms", "hasAudioEvidence", "audioPlatforms", "hasSocialHeatEvidence", "socialHeatSources", "hasIpAdaptationEvidence", "ipAdaptationTypes", "hasAuthorInfluenceEvidence", "authorInfluenceSources"], properties: { hasPrimaryPlatformEvidence: { type: "boolean" }, primaryPlatforms: stringArrayJson(), hasTrustedThirdPartyEvidence: { type: "boolean" }, trustedThirdPartyPlatforms: stringArrayJson(), hasAudioEvidence: { type: "boolean" }, audioPlatforms: stringArrayJson(), hasSocialHeatEvidence: { type: "boolean" }, socialHeatSources: stringArrayJson(), hasIpAdaptationEvidence: { type: "boolean" }, ipAdaptationTypes: stringArrayJson(), hasAuthorInfluenceEvidence: { type: "boolean" }, authorInfluenceSources: stringArrayJson() } },
    ratingResult: ratingPayloadJson(),
  },
} as const;

function sourceTierJson() { return { type: "string", enum: ["tier1_primary", "tier2_trusted_distribution", "tier3_audio_drama", "tier4_social_ip", "tier5_low_weight", "tier0_filtered"] } as const; }
function sourceCategoryJson() { return { type: "string", enum: ["primary_platform", "third_party_reading", "audio_platform", "audio_drama_platform", "social", "news", "encyclopedia", "piracy", "aggregator", "irrelevant", "other"] } as const; }
function evidenceTypeJson() { return { type: "string", enum: ["platform_presence", "ranking", "sales", "comments", "subscription", "author_profile", "ip_adaptation", "social_heat", "audio_performance", "publication", "review", "irrelevant", "other"] } as const; }
function stringArrayJson() { return { type: "array", items: { type: "string" } } as const; }
function partitionJson() { return { type: "array", items: { type: "object", additionalProperties: false, required: ["resultId", "reason"], properties: { resultId: { type: "string" }, reason: { type: "string" } } } } as const; }
function ratingPayloadJson() {
  return { type: "object", additionalProperties: false, required: ["rating", "score", "confidence", "renameSuggestion", "reasonSummary", "riskNotes", "keyEvidence", "evidenceWeighting", "missingEvidence", "operationAdvice", "titleOptimizationPotential", "coverOptimizationPotential", "hasIpAdaptationEvidence", "hasSocialHeatEvidence", "hasAuthorInfluenceEvidence"], properties: { rating: { type: "string", enum: ["S", "A", "B", "C", "D"] }, score: { type: "number", minimum: 0, maximum: 100 }, confidence: { type: "number", minimum: 0, maximum: 1 }, renameSuggestion: { type: "string", enum: ["avoid", "cautious", "recommended", "strongly_recommended"] }, reasonSummary: { type: "string" }, riskNotes: stringArrayJson(), keyEvidence: stringArrayJson(), evidenceWeighting: { type: "array", items: { type: "object", additionalProperties: false, required: ["source", "type", "importance", "effect", "reason"], properties: { source: { type: "string" }, type: { type: "string", enum: ["platform", "ip", "social", "ranking", "sales", "author", "cover", "test", "manual", "other"] }, importance: { type: "string", enum: ["high", "medium", "low"] }, effect: { type: "string", enum: ["increase", "decrease", "neutral"] }, reason: { type: "string" } } } }, missingEvidence: stringArrayJson(), operationAdvice: { type: "string" }, titleOptimizationPotential: { type: "string", enum: ["low", "medium", "high"] }, coverOptimizationPotential: { type: "string", enum: ["low", "medium", "high"] }, hasIpAdaptationEvidence: { type: "boolean" }, hasSocialHeatEvidence: { type: "boolean" }, hasAuthorInfluenceEvidence: { type: "boolean" } } } as const;
}

const require = createRequire(import.meta.url);
const { createOpenAIClient, parsePositiveIntegerFromEnv } = require("../generation/llm/openai-client.cjs") as {
  createOpenAIClient: (config?: { model?: string }) => { client: OpenAI; diagnostics: OpenAIRatingDiagnostics };
  parsePositiveIntegerFromEnv: (name: string, fallback: number) => number;
};

export const OPENAI_RATING_PROMPT_VERSION = "rating-openai-v4";

export type OpenAIRatingDiagnostics = {
  model: string;
  timeoutMs: number;
  usingBaseURL: boolean;
  baseURLHost: string | null;
  usingProxy: boolean;
  proxyProtocol: string | null;
};

export async function generateRatingWithOpenAI(
  input: RatingInput & { supplements: RatingSupplementInput[]; context: Record<string, unknown> },
): Promise<{ result: OpenAIRatingResult; diagnostics: OpenAIRatingDiagnostics }> {
  const model = process.env.OPENAI_RATING_MODEL || process.env.OPENAI_TEXT_MODEL;
  if (!process.env.OPENAI_API_KEY) throw new Error("OpenAI 评级配置缺失：请配置 OPENAI_API_KEY 后重启服务。");
  if (!model) throw new Error("OpenAI 评级配置缺失：请配置 OPENAI_RATING_MODEL 或 OPENAI_TEXT_MODEL 后重启服务。");
  const { client, diagnostics } = createOpenAIClient({ model });
  const maxOutputTokens = parsePositiveIntegerFromEnv("OPENAI_RATING_MAX_OUTPUT_TOKENS", 2200);
  const prompt = [
    "你是中文有声书内容运营评级专家。请基于可验证证据判断作品运营价值。",
    "最终输出必须严格符合 JSON schema。不要把本地规则预估当成事实，不要编造热度或平台数据。",
    "评级为 S/A/B/C/D；分数 0-100；confidence 为 0-1。证据不足时主动降低置信度并写入风险。",
    "补充证据只作为上下文，必须结合来源、可信度和相关性判断。",
    "导入表格或手动录入的 Work.title / Work.author 是业务权威基准。必须使用 importedTitle、importedAuthor、titleForMatching、authorForMatching、titleForEvaluation、authorForEvaluation，不得用搜索结果覆盖。",
    "外部搜索结果中的作者不同，不代表作品价值低，只代表该搜索结果可能不是同一作品。不得因为作者不一致降低作品价值评级。Work.author 为空时可以降低证据置信度并提示补充，但不得直接降低作品价值评级。",
    "评级用于判断作品是否适合投入多书名运营、封面重绘、标题优化和后续运营资源。",
    "封面评分是独立视觉运营指标，不得作为作品价值评级的减分依据。作品价值评级应基于作品内容、作者、平台表现、首发站点数据、三方平台表现、IP/社媒热度、人工补充证据等判断。",
    "未检索到音频播放量、评论、订阅、付费、榜单等数据，不代表作品表现差，不得作为减分项。仅当平台明确显示表现弱，或操作人提供的数据表明表现弱时，才可作为负面证据。",
    "仅使用 context.searchEvidence 中已规范化的搜索证据。Tier 1 首发/官方、Tier 2 三方阅读、Tier 3 音频优先于 Tier 5 普通网页；Tier 0 盗版、采集和侵权聚合站不得参与评级。",
    "searchEvidence.preliminarySignals 只是本地关键词初筛诊断，不是已确认事实。你必须根据原始标题、摘要、URL、来源和人工补充材料重新判断，不得直接采信。",
    "你必须逐条输出 searchResultAnalysis，并将搜索结果分区为 acceptedEvidence、uncertainEvidence 和 rejectedEvidence。ratingResult 只能基于作品基础信息、人工补充证据和 acceptedEvidence；rejectedEvidence 不得影响评级，uncertainEvidence 只能影响 confidence 或 riskNotes。",
    "sameWorkDecision=rejected、tier0_filtered、piracy、aggregator、claimStrength=none 或 canAffectRating=false 的搜索结果不得进入 acceptedEvidence。",
    "evidenceTags 中每一个 true 标签必须能追溯到 acceptedEvidence；ratingResult.keyEvidence 不得引用 rejectedEvidence 或 uncertainEvidence。",
    "不得仅凭平台名称、站点归属或集团关系判断 IP 改编、影视化、动画化、广播剧化、出版化、社媒热度、平台热度或作者影响力。",
    "爱奇艺文学只是文学平台证据，不等于爱奇艺影视改编；腾讯动漫只是漫画/内容平台证据，不等于腾讯视频影视化；网易云音乐上的有声内容不等于网易门户新闻热度。",
    "缺少影视/IP 证据不得作为减分项，只能说明未发现可确认 IP 改编。只有明确的标题、摘要、新闻、百科、官方页面、平台上线信息或人工补充证据可以支撑相应标签。",
    "evidenceTags 和 ratingResult 中的 hasIpAdaptationEvidence、hasSocialHeatEvidence、hasAuthorInfluenceEvidence 必须根据明确 acceptedEvidence 判断。没有明确证据时必须返回 false。",
    "missingEvidence 每项 shouldPenalize 必须为 false。缺失信息只用于提示补充，不得作为默认减分依据。",
    JSON.stringify(toModelInput(input)),
  ].join("\n\n");
  const endpoint = process.env.OPENAI_TEXT_ENDPOINT === "chat_completions" ? "chat_completions" : "responses";
  const outputText = endpoint === "chat_completions"
    ? await generateWithChatCompletions(client, diagnostics.model, prompt, maxOutputTokens)
    : await generateWithResponses(client, diagnostics.model, prompt, maxOutputTokens);

  if (!outputText) throw new Error("OpenAI 评级响应为空。");
  let parsed: unknown;
  try {
    parsed = JSON.parse(outputText);
  } catch (error) {
    throw new Error(`OpenAI 评级响应不是有效 JSON：${String(error)}`);
  }
  const validation = ratingResultSchema.safeParse(parsed);
  if (!validation.success) throw new Error(`OpenAI 评级响应结构校验失败：${validation.error.message}`);
  validateOpenAIRatingBoundaries(validation.data, input);
  return { result: validation.data, diagnostics };
}

function toModelInput(input: RatingInput & { supplements: RatingSupplementInput[]; context: Record<string, unknown> }) {
  const context = { ...input.context };
  delete context.filteredOutSummary;
  const work = input.work;
  return {
    work: {
      id: work.id,
      importedTitle: work.importedTitle ?? work.title,
      importedAuthor: work.importedAuthor ?? work.author,
      titleForMatching: work.titleForMatching ?? work.title,
      authorForMatching: work.authorForMatching ?? work.author,
      titleForEvaluation: work.titleForEvaluation ?? work.title,
      authorForEvaluation: work.authorForEvaluation ?? work.author,
      category: work.category,
      contentType: work.contentType,
      description: work.intro,
      notes: work.notes ?? work.remark,
    },
    searchResults: context.searchEvidence ?? [],
    manualSupplements: input.supplements.map((item, index) => ({ resultId: `manual-supplement-${index + 1}`, ...item })),
    coverModuleSummary: context.coverModuleSummary ?? null,
    businessGoal: "本评级用于判断作品是否适合投入多书名运营、标题优化、封面重绘和后续运营资源。请优先判断作品本身价值、首发/官方平台证据、三方平台表现、作者影响力、明确可证实的 IP / 社媒热度和人工补充证据。",
    context,
  };
}

export function validateOpenAIRatingBoundaries(
  result: OpenAIRatingResult,
  input: RatingInput & { supplements: RatingSupplementInput[]; context: Record<string, unknown> },
) {
  const context = input.context;
  const rating = result.ratingResult;
  const importedAuthor = input.work.importedAuthor || input.work.author || "";
  const searchEvidence = Array.isArray(context.searchEvidence) ? context.searchEvidence.filter(isRecord) : [];
  const filteredEvidence = Array.isArray(context.filteredOutSummary) ? context.filteredOutSummary.filter(isRecord) : [];
  const allText = [rating.reasonSummary, rating.operationAdvice, ...rating.riskNotes, ...rating.keyEvidence, ...rating.evidenceWeighting.map((item) => `${item.source} ${item.reason}`), ...result.acceptedEvidence.map((item) => `${item.source} ${item.claim} ${item.reason}`)].join(" ");
  const invalidReasons: string[] = [];
  const analysisById = new Map(result.searchResultAnalysis.map((item) => [item.resultId, item]));
  const inputSearchResultIds = new Set(searchEvidence.map((item) => String(item.resultId || "")).filter(Boolean));
  const acceptedIds = new Set(result.acceptedEvidence.map((item) => item.resultId));
  const uncertainIds = new Set(result.uncertainEvidence.map((item) => item.resultId));
  const rejectedIds = new Set(result.rejectedEvidence.map((item) => item.resultId));
  const acceptedText = result.acceptedEvidence.map((item) => `${item.source} ${item.claim} ${item.reason}`).join(" ");

  if (rating.evidenceWeighting.some((item) => item.type === "cover" && item.effect === "decrease")) {
    invalidReasons.push("封面评分不得作为作品价值评级减分依据。");
  }
  if (/(封面|视觉).*(低分|较差|不足).*(扣分|降分|降低|下调)/.test(allText)) {
    invalidReasons.push("封面质量不得作为作品价值评级减分依据。");
  }
  if (rating.evidenceWeighting.some((item) => item.effect === "decrease" && /缺少|未检索到|暂无|未发现/.test(item.reason))) {
    invalidReasons.push("证据缺失不得作为作品价值评级默认减分依据。");
  }
  if (importedAuthor && rating.evidenceWeighting.some((item) => item.effect === "decrease" && /作者.*不一致|作者差异|作者不匹配|外部作者/.test(item.reason))) {
    invalidReasons.push("外部搜索作者差异不得作为作品价值评级减分依据。");
  }
  if (/(外部|搜索).{0,8}作者.{0,8}(不一致|差异|不匹配).{0,12}(扣分|降分|降低|下调)/.test(allText)) {
    invalidReasons.push("外部搜索作者差异不得作为作品价值评级减分依据。");
  }
  if (/(缺少|未检索到|暂无|未发现).{0,18}(音频|播放|评论|订阅|付费|榜单|IP|影视).{0,18}(扣分|降分|降低|下调)/.test(allText)) {
    invalidReasons.push("缺失证据不得作为作品价值评级默认减分依据。");
  }
  if (/盗版|采集站|笔趣|免费全文|无弹窗|txt下载/i.test(allText)) {
    invalidReasons.push("盗版、采集或侵权聚合站不得进入作品价值评级证据。");
  }
  if (/爱奇艺文学.*(影视|改编|剧版)|腾讯动漫.*(腾讯视频|影视|改编)|网易云音乐.*(门户|新闻|热度)/.test(allText)) {
    invalidReasons.push("平台集团关系不得误判为 IP 改编或门户热度证据。");
  }
  if (result.missingEvidence.some((item) => item.shouldPenalize !== false)) {
    invalidReasons.push("缺失证据不得作为作品价值评级默认减分依据。");
  }
  for (const evidence of result.acceptedEvidence) {
    const analysis = analysisById.get(evidence.resultId);
    const isManualSupplement = evidence.resultId.startsWith("manual-supplement-");
    if (!isManualSupplement && (!analysis || analysis.sameWorkDecision !== "matched" || analysis.sourceTier === "tier0_filtered" || analysis.sourceCategory === "piracy" || analysis.sourceCategory === "aggregator" || analysis.claimStrength === "none" || !analysis.canAffectRating)) {
      invalidReasons.push(`acceptedEvidence 引用了不可参与评级的搜索结果：${evidence.resultId}`);
    }
  }
  if (Array.from(inputSearchResultIds).some((id) => !analysisById.has(id))) {
    invalidReasons.push("searchResultAnalysis 未逐条覆盖输入搜索结果。");
  }
  if (result.searchResultAnalysis.some((item) => !inputSearchResultIds.has(item.resultId))) {
    invalidReasons.push("searchResultAnalysis 引用了输入中不存在的搜索结果。");
  }
  if (result.searchResultAnalysis.some((item) => item.sameWorkDecision === "rejected" && acceptedIds.has(item.resultId))) {
    invalidReasons.push("sameWorkDecision=rejected 的搜索结果不得进入 acceptedEvidence。");
  }
  if (result.searchResultAnalysis.some((item) => item.sameWorkDecision === "uncertain" && acceptedIds.has(item.resultId))) {
    invalidReasons.push("sameWorkDecision=uncertain 的搜索结果不得作为核心评级依据。");
  }
  if (rating.keyEvidence.some((item) => includesPartitionReference(item, result.rejectedEvidence))) {
    invalidReasons.push("关键证据引用了 rejectedEvidence。");
  }
  if (rating.keyEvidence.some((item) => includesPartitionReference(item, result.uncertainEvidence))) {
    invalidReasons.push("关键证据引用了 uncertainEvidence，且未说明其不能作为核心评级依据。");
  }
  if (result.evidenceTags.hasPrimaryPlatformEvidence && !hasAcceptedEvidence(result, ["platform_presence"], ["tier1_primary"])) {
    invalidReasons.push("hasPrimaryPlatformEvidence=true，但 acceptedEvidence 中没有首发或官方平台证据。");
  }
  if (result.evidenceTags.hasTrustedThirdPartyEvidence && !hasAcceptedEvidence(result, ["platform_presence"], ["tier2_trusted_distribution"])) {
    invalidReasons.push("hasTrustedThirdPartyEvidence=true，但 acceptedEvidence 中没有可信三方平台证据。");
  }
  if (result.evidenceTags.hasAudioEvidence && !hasAcceptedEvidence(result, ["audio_performance", "platform_presence"], ["tier3_audio_drama"])) {
    invalidReasons.push("hasAudioEvidence=true，但 acceptedEvidence 中没有音频平台证据。");
  }
  if (result.evidenceTags.hasIpAdaptationEvidence && !hasAcceptedEvidence(result, ["ip_adaptation"])) {
    invalidReasons.push("hasIpAdaptationEvidence=true，但 acceptedEvidence 中没有明确 IP 改编证据。");
  }
  if (result.evidenceTags.hasSocialHeatEvidence && !hasAcceptedEvidence(result, ["social_heat"])) {
    invalidReasons.push("hasSocialHeatEvidence=true，但 acceptedEvidence 中没有明确社媒热度证据。");
  }
  if (result.evidenceTags.hasAuthorInfluenceEvidence && !hasAcceptedEvidence(result, ["author_profile"])) {
    invalidReasons.push("hasAuthorInfluenceEvidence=true，但 acceptedEvidence 中没有明确作者影响力证据。");
  }
  const ipClaims = rating.evidenceWeighting.filter((item) => item.type === "ip" && item.effect !== "neutral");
  if ((rating.hasIpAdaptationEvidence || result.evidenceTags.hasIpAdaptationEvidence || ipClaims.length || /(影视化|影视改编|IP改编|剧版)/.test(allText)) && !hasExplicitIpEvidence(searchEvidence, input.supplements)) {
    invalidReasons.push("存在 IP 改编判断，但没有明确的 IP 改编原始证据。");
  }
  if ((rating.hasSocialHeatEvidence || result.evidenceTags.hasSocialHeatEvidence) && !hasExplicitSocialHeatEvidence(searchEvidence, input.supplements)) {
    invalidReasons.push("存在社媒热度判断，但没有明确的社媒热度原始证据。");
  }
  if ((rating.hasAuthorInfluenceEvidence || result.evidenceTags.hasAuthorInfluenceEvidence) && !hasExplicitAuthorInfluenceEvidence(searchEvidence, input.supplements)) {
    invalidReasons.push("存在作者影响力判断，但没有明确的作者影响力原始证据。");
  }
  const hasTrustedEvidence = searchEvidence.some((item) => item.sourceTier === 1 || item.sourceTier === 2);
  const tier5Sources = searchEvidence.filter((item) => item.sourceTier === 5).map((item) => String(item.sourcePlatform || ""));
  if (hasTrustedEvidence && tier5Sources.some((source) => source && rating.keyEvidence.some((item) => item.includes(source)))) {
    invalidReasons.push("已有首发或可信三方来源时，不得将普通低权重网页作为主要评级依据。");
  }
  if (filteredEvidence.some((item) => {
    const texts = [item.url, item.sourcePlatform, item.sourceName].filter((value): value is string => typeof value === "string" && value.length > 3);
    return texts.some((text) => rating.keyEvidence.some((evidence) => evidence.includes(text)));
  })) {
    invalidReasons.push("关键证据引用了已过滤或 rejected 的搜索结果。");
  }
  if ((rejectedIds.size || uncertainIds.size) && acceptedText && Array.from(rejectedIds).some((id) => acceptedIds.has(id))) {
    invalidReasons.push("已拒绝或不确定搜索结果不得进入 acceptedEvidence。");
  }
  if (invalidReasons.length) throw new OpenAIRatingValidationError(`OpenAI 评级结果无效：${invalidReasons.join("；")}`);
}

function hasAcceptedEvidence(result: OpenAIRatingResult, evidenceTypes: string[], sourceTiers?: string[]) {
  return result.acceptedEvidence.some((item) => evidenceTypes.includes(item.evidenceType) && (!sourceTiers || sourceTiers.includes(item.sourceTier)));
}

function includesPartitionReference(keyEvidence: string, partition: Array<{ resultId: string; reason: string }>) {
  return partition.some((item) => keyEvidence.includes(item.resultId) || (item.reason.length > 4 && keyEvidence.includes(item.reason)));
}

function hasExplicitIpEvidence(searchEvidence: Record<string, unknown>[], supplements: RatingSupplementInput[]) {
  const text = [
    ...searchEvidence.flatMap((item) => [item.title, item.detail, item.url]),
    ...supplements.flatMap((item) => [item.title, item.content, item.evidencePlatform, item.evidenceUrl]),
  ].filter((value): value is string => typeof value === "string").join(" ");
  return /(影视化|影视改编|改编为|电视剧|网剧|剧版|动画化|漫画改编|广播剧|出版|上线|播出|官宣|主演)/.test(text);
}

function hasExplicitSocialHeatEvidence(searchEvidence: Record<string, unknown>[], supplements: RatingSupplementInput[]) {
  const text = evidenceText(searchEvidence, supplements);
  return /(热搜|话题阅读|讨论量|点赞|转发|收藏|播放量|榜单|排名|粉丝|订阅)/.test(text);
}

function hasExplicitAuthorInfluenceEvidence(searchEvidence: Record<string, unknown>[], supplements: RatingSupplementInput[]) {
  const text = evidenceText(searchEvidence, supplements);
  return /(作者|作家).*(获奖|代表作|销量|粉丝|榜单|签约|白金|大神|知名)/.test(text);
}

function evidenceText(searchEvidence: Record<string, unknown>[], supplements: RatingSupplementInput[]) {
  return [
    ...searchEvidence.flatMap((item) => [item.title, item.detail, item.url]),
    ...supplements.flatMap((item) => [item.title, item.content, item.evidencePlatform, item.evidenceUrl]),
  ].filter((value): value is string => typeof value === "string").join(" ");
}

export class OpenAIRatingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenAIRatingValidationError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function generateWithResponses(client: OpenAI, model: string, prompt: string, maxOutputTokens: number) {
  const response = await client.responses.create({
    model,
    input: [{ role: "user", content: prompt }],
    text: { format: { type: "json_schema", name: "work_rating_result", schema: jsonSchema, strict: true } },
    max_output_tokens: maxOutputTokens,
  });
  return response.output_text || "";
}

async function generateWithChatCompletions(client: OpenAI, model: string, prompt: string, maxOutputTokens: number) {
  const response = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    max_tokens: maxOutputTokens,
  });
  return response.choices[0]?.message?.content || "";
}
