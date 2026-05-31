// @ts-expect-error Node strip-types runtime requires the explicit TypeScript extension.
import { classifySource, normalizeSearchEvidenceForRating } from "../src/lib/evidence/source-taxonomy.ts";
// @ts-expect-error Node strip-types runtime requires the explicit TypeScript extension.
import { normalizeProviderResults } from "../src/lib/adapters/search-adapter.ts";
// @ts-expect-error Node strip-types runtime requires the explicit TypeScript extension.
import { validateOpenAIRatingBoundaries } from "../src/lib/rating/openai-rating-provider.ts";
// @ts-expect-error Node strip-types runtime requires the explicit TypeScript extension.
import { appendRatingRecoveryHint, mapRatingInvalidReasonToUserMessage } from "../src/lib/rating/rating-error-messages.ts";
import type { CandidateWork } from "../src/lib/adapters/search-adapter";
import type { OpenAIRatingResult } from "../src/lib/rating/rating-types";

const official = candidate("起点中文网", "book.qidian.com", "https://book.qidian.com/info/1", 95);
const officialDuplicate = candidate("起点中文网", "book.qidian.com", "https://book.qidian.com/info/2", 80);
const piracy = candidate("笔趣阁免费全文", "example-biqu.com", "https://example-biqu.com/book/1", 99);
const social = candidate("微博", "weibo.com", "https://weibo.com/topic/1", 75);
const iqiyiLiterature = candidate("爱奇艺文学", "wenxue.iqiyi.com", "https://wenxue.iqiyi.com/book/1", 70);
const normalized = normalizeSearchEvidenceForRating([piracy, officialDuplicate, social, official], "web_novel");

assert(normalized.selectedEvidence.length === 2, "应保留起点和微博两条证据。");
assert(normalized.sourceDiagnostics.piracyFilteredCount === 1, "盗版站应被过滤。");
assert(normalized.sourceDiagnostics.duplicateFilteredCount === 1, "同站点应只保留一条。");
assert(normalized.selectedEvidence[0]?.sourceTier === 1, "Tier 1 官方来源应优先。");
assert(normalized.selectedEvidence.every((item) => item.resultId.startsWith("search-result-")), "进入 OpenAI 的搜索证据必须具有稳定 resultId。");
assert(classifySource(social, "web_novel").sourceCategory === "social_or_ip", "微博应归入社媒/IP。");
assert(classifySource(iqiyiLiterature, "web_novel").sourceCategory === "primary", "爱奇艺文学应归入文学平台，不得直接视为影视改编。");
assert(normalized.selectedEvidence.every((item) => Array.isArray(item.preliminarySignals)), "评级搜索证据必须显式标记 preliminarySignals。");

const platformBoundaryResults = normalizeProviderResults([
  { title: "测试作品", url: "https://wenxue.iqiyi.com/book/1", snippet: "文学平台作品页", sourceName: "爱奇艺文学" },
  { title: "测试作品", url: "https://ac.qq.com/Comic/comicInfo/id/1", snippet: "漫画内容页", sourceName: "腾讯动漫" },
  { title: "测试作品", url: "https://music.163.com/#/program?id=1", snippet: "有声内容页", sourceName: "网易云音乐" },
], 10);

assert(platformBoundaryResults.items[0]?.sourceCategory === "ebook_platform", "爱奇艺文学必须保持文学平台分类。");
assert(platformBoundaryResults.items[1]?.sourceCategory === "ebook_platform", "腾讯动漫必须保持内容平台分类。");
assert(platformBoundaryResults.items[2]?.sourceCategory === "audio_platform", "网易云音乐必须保持音频平台分类。");
assert(platformBoundaryResults.items.every((item) => item.ipEvidence.length === 0), "仅有平台名称时不得生成 IP 改编信号。");
assert(platformBoundaryResults.items.every((item) => item.heatEvidence.length === 0), "仅有平台名称时不得生成热度信号。");

const boundaryInput: Parameters<typeof validateOpenAIRatingBoundaries>[1] = {
  work: { id: "work-1", title: "测试作品", author: "导入作者", intro: "", category: "", coverFileName: null, remark: null, playCount: null, clickRate: null, completionRate: null },
  identification: null,
  supplements: [],
  context: {
    searchEvidence: [{ resultId: "search-result-1", title: "测试作品", detail: "爱奇艺文学作品页", url: "https://wenxue.iqiyi.com/book/1", sourceTier: 1, sourcePlatform: "爱奇艺文学" }],
    filteredOutSummary: [{ sourcePlatform: "无关聚合站", url: "https://invalid.example/book/1" }],
  },
};
const validResult: OpenAIRatingResult = {
  searchResultAnalysis: [{ resultId: "search-result-1", sameWorkDecision: "matched", sameWorkProbability: 0.9, sourceTier: "tier1_primary", sourceCategory: "primary_platform", evidenceType: "platform_presence", claimStrength: "medium", canAffectRating: true, reason: "文学平台作品页", extractedClaims: ["爱奇艺文学作品页"] }],
  acceptedEvidence: [{ resultId: "search-result-1", source: "爱奇艺文学", sourceTier: "tier1_primary", evidenceType: "platform_presence", claim: "存在文学平台作品页", effect: "neutral", importance: "medium", reason: "仅证明平台收录" }],
  uncertainEvidence: [],
  rejectedEvidence: [],
  missingEvidence: [{ type: "ip_adaptation", reason: "未发现可确认 IP 改编证据。", shouldPenalize: false }],
  evidenceTags: { hasPrimaryPlatformEvidence: true, primaryPlatforms: ["爱奇艺文学"], hasTrustedThirdPartyEvidence: false, trustedThirdPartyPlatforms: [], hasAudioEvidence: false, audioPlatforms: [], hasSocialHeatEvidence: false, socialHeatSources: [], hasIpAdaptationEvidence: false, ipAdaptationTypes: [], hasAuthorInfluenceEvidence: false, authorInfluenceSources: [] },
  ratingResult: {
    rating: "B", score: 65, confidence: 0.6, renameSuggestion: "recommended", reasonSummary: "证据有限，保守评级。",
    riskNotes: [], keyEvidence: ["爱奇艺文学作品页"], evidenceWeighting: [], missingEvidence: ["未发现可确认 IP 改编证据。"],
    operationAdvice: "建议继续补充证据。", titleOptimizationPotential: "medium", coverOptimizationPotential: "medium",
    hasIpAdaptationEvidence: false, hasSocialHeatEvidence: false, hasAuthorInfluenceEvidence: false,
  },
};

validateOpenAIRatingBoundaries(validResult, boundaryInput);
assertInvalid({ ...validResult, evidenceTags: { ...validResult.evidenceTags, hasIpAdaptationEvidence: true }, ratingResult: { ...validResult.ratingResult, hasIpAdaptationEvidence: true } }, boundaryInput, "仅有爱奇艺文学命中时不得生成影视/IP 标签。");
assertInvalid({ ...validResult, evidenceTags: { ...validResult.evidenceTags, hasSocialHeatEvidence: true }, ratingResult: { ...validResult.ratingResult, hasSocialHeatEvidence: true } }, {
  ...boundaryInput,
  context: { ...boundaryInput.context, searchEvidence: [{ resultId: "search-result-1", title: "测试作品", detail: "网易云音乐有声内容页", url: "https://music.163.com/#/program?id=1", sourceTier: 3, sourcePlatform: "网易云音乐" }] },
}, "仅有网易云音乐命中时不得生成门户或社媒热度标签。");
assertInvalid({ ...validResult, ratingResult: { ...validResult.ratingResult, evidenceWeighting: [{ source: "搜索结果", type: "author", importance: "low", effect: "decrease", reason: "外部搜索作者不一致，因此降低评分" }] } }, boundaryInput, "外部作者不一致不得降低作品价值评分。");
assertInvalid({ ...validResult, ratingResult: { ...validResult.ratingResult, evidenceWeighting: [{ source: "封面", type: "cover", importance: "low", effect: "decrease", reason: "封面评分较低，因此降低评分" }] } }, boundaryInput, "封面低分不得降低作品价值评分。");
assertInvalid({ ...validResult, ratingResult: { ...validResult.ratingResult, evidenceWeighting: [{ source: "音频", type: "platform", importance: "low", effect: "decrease", reason: "缺少音频播放量，因此降低评分" }] } }, boundaryInput, "缺少音频数据不得降低作品价值评分。");
assertInvalid({ ...validResult, ratingResult: { ...validResult.ratingResult, keyEvidence: ["无关聚合站提供高热度证据"] } }, boundaryInput, "已过滤结果不得进入关键证据。");
assertInvalid({ ...validResult, searchResultAnalysis: [{ ...validResult.searchResultAnalysis[0], sameWorkDecision: "rejected" }] }, boundaryInput, "rejected 搜索结果不得进入 acceptedEvidence。");
assertInvalid({ ...validResult, searchResultAnalysis: [{ ...validResult.searchResultAnalysis[0], sameWorkDecision: "uncertain" }] }, boundaryInput, "uncertain 搜索结果不得进入 acceptedEvidence。");
assertInvalid({ ...validResult, missingEvidence: [{ type: "audio", reason: "缺少播放量", shouldPenalize: true as false }] }, boundaryInput, "missingEvidence 不得默认扣分。");

const platformRelationMessage = mapRatingInvalidReasonToUserMessage(
  "OpenAI 评级结果无效：平台集团关系不能作为 IP 改编判断依据。",
);
assert(platformRelationMessage.includes("平台名称或集团关系"), "平台关系误判应映射为运营可读中文提示。");

const missingAudioMessage = mapRatingInvalidReasonToUserMessage(
  "OpenAI 评级结果无效：缺少音频平台数据不能作为减分项。",
);
assert(missingAudioMessage.includes("缺失数据作为减分项"), "缺失音频数据误判应映射为运营可读中文提示。");

const rejectedEvidenceMessage = mapRatingInvalidReasonToUserMessage(
  "OpenAI 评级结果无效：keyEvidence 引用了已过滤或不确定的搜索结果。",
);
assert(rejectedEvidenceMessage.includes("已过滤或不确定的搜索结果"), "被过滤证据引用应映射为运营可读中文提示。");

const recoveryMessage = appendRatingRecoveryHint(rejectedEvidenceMessage);
assert(recoveryMessage.includes("当前已采用评级不会被覆盖"), "invalid 提示应说明当前评级不会被覆盖。");
assert(recoveryMessage.includes("补充人工证据后重新评级"), "invalid 提示应说明补充证据后的恢复路径。");

console.log("Rating evidence taxonomy tests passed.");

function candidate(platform: string, host: string, url: string, score: number): CandidateWork {
  return {
    title: "测试作品", author: "测试作者", platform, summary: "测试摘要", score,
    matchReasons: [], excludeReasons: [], possibleDuplicate: false, candidateTitle: "测试作品",
    sourcePlatform: platform, matchReason: "", excludeReason: "", suspectedSameName: false,
    canonicalSourceName: platform, sourceName: platform, host, url, relevanceScore: score,
  };
}
function assert(condition: boolean, message: string) { if (!condition) throw new Error(message); }
function assertInvalid(result: OpenAIRatingResult, input: Parameters<typeof validateOpenAIRatingBoundaries>[1], message: string) {
  let invalid = false;
  try { validateOpenAIRatingBoundaries(result, input); } catch { invalid = true; }
  assert(invalid, message);
}
