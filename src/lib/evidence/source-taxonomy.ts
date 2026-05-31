import type { CandidateWork } from "@/lib/adapters/search-adapter";

export type WorkContentType = "web_novel" | "ebook" | "audiobook" | "audio_drama";
export type SourceTier = 0 | 1 | 2 | 3 | 4 | 5;
export type SourceCategory = "primary" | "distribution" | "audio" | "social_or_ip" | "ordinary" | "piracy_or_aggregator";

export type NormalizedRatingEvidence = {
  resultId: string;
  title: string;
  detail: string;
  url: string | null;
  domain: string | null;
  sourceName: string;
  sourceTier: SourceTier;
  sourceCategory: SourceCategory;
  sourcePlatform: string;
  sourceGroup: string;
  rawRank: number | null;
  preliminarySignals: string[];
  evidenceWeight: number;
};

export type SourceDiagnostics = {
  tier1Count: number; tier2Count: number; tier3Count: number; tier4Count: number; tier5Count: number;
  piracyFilteredCount: number; duplicateFilteredCount: number;
};

const primaryPlatforms = [
  "起点中文网", "创世中文网", "起点女生网", "云起书院", "红袖添香", "潇湘书院", "小说阅读网", "言情小说吧",
  "WebNovel", "腾讯动漫", "新丽传媒", "番茄小说网", "番茄小说", "七猫中文网", "奇妙小说网", "晋江文学城",
  "掌阅小说网", "书山中文网", "红薯中文网", "趣阅小说网", "神起中文网", "有乐中文网", "17K小说网",
  "四月天小说网", "汤圆创作", "万丈书城", "奇想宇宙", "谜想计划", "海狸故事", "书旗中文网", "咪咕文学",
  "知乎盐言故事", "快看小说", "免费小说大全", "小说阅读吧", "点众阅读", "西瓜免费小说", "飞卢小说网",
  "磨铁中文网", "来看中文网", "墨墨言情网", "逸云书院", "锦文小说网", "塔读文学", "黑岩网", "刺猬猫",
  "长佩文学", "豆瓣阅读", "爱奇艺文学",
];
const distributionPlatforms = ["微信读书", "QQ阅读", "得到", "樊登", "掌阅", "七猫", "手机百度", "咪咕"];
const audioPlatforms = ["喜马拉雅", "番茄畅听", "QQ音乐", "酷狗音乐", "酷我音乐", "懒人听书", "网易云音乐", "猫耳FM", "克拉漫播", "长佩"];
const socialPlatforms = ["微博", "抖音", "小红书", "快手", "百度百科", "百科", "新闻", "门户"];
const piracyPatterns = [/盗版/i, /采集/i, /聚合/i, /免费全文/i, /笔趣/i, /无弹窗/i, /txt下载/i, /小说网盘/i, /booktxt/i, /biqu/i];

export function normalizeSearchEvidenceForRating(candidates: CandidateWork[], contentType: WorkContentType) {
  const filteredOutResults: Array<{ resultId: string; title: string; url: string | null; sourcePlatform: string; reason: string }> = [];
  const selectedEvidence: NormalizedRatingEvidence[] = [];
  const seenGroups = new Set<string>();
  let piracyFilteredCount = 0;
  let duplicateFilteredCount = 0;

  for (const [index, candidate] of [...candidates].sort((a, b) => (b.relevanceScore ?? b.score) - (a.relevanceScore ?? a.score)).entries()) {
    const resultId = `search-result-${index + 1}`;
    const classified = classifySource(candidate, contentType);
    if (classified.isPiracyOrAggregator) {
      piracyFilteredCount += 1;
      filteredOutResults.push({ resultId, title: candidate.title, url: candidate.url ?? null, sourcePlatform: classified.sourcePlatform, reason: "盗版、采集或低质量聚合来源，不进入评级证据。" });
      continue;
    }
    if (seenGroups.has(classified.sourceGroup)) {
      duplicateFilteredCount += 1;
      filteredOutResults.push({ resultId, title: candidate.title, url: candidate.url ?? null, sourcePlatform: classified.sourcePlatform, reason: "同站点或同平台已有更相关证据，仅保留一条。" });
      continue;
    }
    seenGroups.add(classified.sourceGroup);
    selectedEvidence.push({
      resultId,
      title: candidate.title,
      detail: candidate.snippet || candidate.summary,
      url: candidate.url ?? null,
      domain: candidate.host ?? null,
      sourceName: classified.sourcePlatform,
      sourceTier: classified.sourceTier,
      sourceCategory: classified.sourceCategory,
      sourcePlatform: classified.sourcePlatform,
      sourceGroup: classified.sourceGroup,
      rawRank: candidate.rawRank ?? null,
      preliminarySignals: [
        ...(candidate.ipEvidence ?? []).map((item) => `本地关键词初筛：${item.evidenceText}`),
        ...(candidate.heatEvidence ?? []).map((item) => `本地关键词初筛：${item.evidenceText}`),
      ],
      evidenceWeight: classified.evidenceWeight,
    });
  }
  return {
    selectedEvidence,
    filteredOutResults,
    sourceDiagnostics: {
      tier1Count: countTier(selectedEvidence, 1), tier2Count: countTier(selectedEvidence, 2), tier3Count: countTier(selectedEvidence, 3),
      tier4Count: countTier(selectedEvidence, 4), tier5Count: countTier(selectedEvidence, 5), piracyFilteredCount, duplicateFilteredCount,
    } satisfies SourceDiagnostics,
  };
}

export function classifySource(candidate: CandidateWork, contentType: WorkContentType) {
  const platform = candidate.canonicalSourceName || candidate.sourceName || candidate.platform || candidate.host || "未知来源";
  const text = `${platform} ${candidate.host ?? ""} ${candidate.url ?? ""}`;
  const isPiracyOrAggregator = piracyPatterns.some((pattern) => pattern.test(text));
  const isOfficialOrPrimary = includesAny(platform, primaryPlatforms);
  const isAudioPlatform = includesAny(platform, audioPlatforms);
  const isSocialOrIpEvidence = includesAny(platform, socialPlatforms) || candidate.sourceCategory === "social_media" || candidate.sourceCategory === "encyclopedia" || candidate.sourceCategory === "news";
  const isTrustedThirdParty = includesAny(platform, distributionPlatforms);
  const sourceTier: SourceTier = isPiracyOrAggregator ? 0 : isOfficialOrPrimary ? 1 : isTrustedThirdParty ? 2 : isAudioPlatform ? 3 : isSocialOrIpEvidence ? 4 : 5;
  const sourceCategory: SourceCategory = sourceTier === 0 ? "piracy_or_aggregator" : sourceTier === 1 ? "primary" : sourceTier === 2 ? "distribution" : sourceTier === 3 ? "audio" : sourceTier === 4 ? "social_or_ip" : "ordinary";
  const baseWeight = [0, 1, 0.82, 0.72, 0.62, 0.2][sourceTier];
  const contentBoost = (contentType === "audiobook" || contentType === "audio_drama") && isAudioPlatform ? 0.12 : 0;
  return {
    sourceTier, sourceCategory, sourcePlatform: platform, sourceGroup: normalizeGroup(candidate.host || platform),
    isOfficialOrPrimary, isTrustedThirdParty, isAudioPlatform, isSocialOrIpEvidence, isPiracyOrAggregator,
    evidenceWeight: Math.min(baseWeight + contentBoost, 1),
  };
}

export function contentTypeLabel(value: string) {
  return ({ web_novel: "网文", ebook: "出版电子书", audiobook: "有声小说", audio_drama: "广播剧" } as Record<string, string>)[value] || "未设置";
}
export function normalizeContentType(value: unknown): WorkContentType {
  return value === "ebook" || value === "audiobook" || value === "audio_drama" ? value : "web_novel";
}
function normalizeGroup(value: string) { return value.toLowerCase().replace(/^www\./, "").trim(); }
function includesAny(value: string, values: string[]) { return values.some((item) => value.includes(item)); }
function countTier(items: NormalizedRatingEvidence[], tier: SourceTier) { return items.filter((item) => item.sourceTier === tier).length; }
