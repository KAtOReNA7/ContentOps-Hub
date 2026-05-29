export type SearchSourceType = "audio_platform" | "ebook_platform" | "search_engine" | "social_media" | "unknown";

export type SearchWorkInput = {
  title: string;
  author: string | null;
  intro: string;
  category: string | null;
  coverFileName: string | null;
  remark: string | null;
  externalId?: string | null;
};

type LegacySearchWorkInput = {
  title: string;
  author: string | null;
  description: string;
  category: string | null;
  coverFileName: string | null;
  notes?: string | null;
  externalId?: string | null;
};

export type SearchResultItem = {
  title: string;
  url: string | null;
  snippet: string;
  sourceName: string;
  sourceType: SearchSourceType;
  matchedTitle: string | null;
  matchedAuthor: string | null;
  confidenceHint: number | null;
  riskHints: string[];
  rawRank: number | null;
};

export type SearchEvidence = {
  title: string;
  detail: string;
  sourceType: SearchSourceType;
  url: string | null;
  weight: number;
};

export type SearchProviderConfig = {
  provider: "mock" | "real" | "custom";
  apiKey: string | null;
  baseUrl: string | null;
  timeoutMs: number;
  maxResults: number;
};

export interface SearchProvider {
  name: string;
  search(query: string, work: SearchWorkInput, config: SearchProviderConfig): Promise<SearchResultItem[]>;
}

export type RecognitionResult = {
  category: string;
  marketTags: string[];
  similarTitlePattern: string;
};

export type CandidateWork = {
  title: string;
  author: string;
  platform: string;
  summary: string;
  score: number;
  matchReasons: string[];
  excludeReasons: string[];
  possibleDuplicate: boolean;
  candidateTitle: string;
  sourcePlatform: string;
  matchReason: string;
  excludeReason: string;
  suspectedSameName: boolean;
  url?: string | null;
  snippet?: string;
  sourceName?: string;
  sourceType?: SearchSourceType;
  matchedTitle?: string | null;
  matchedAuthor?: string | null;
  confidenceHint?: number | null;
  riskHints?: string[];
  rawRank?: number | null;
};

export type FinalMatch = {
  title: string;
  author: string;
};

export type LegacyFinalMatch = {
  matchedTitle: string;
  matchedAuthor: string;
  confidence: number;
  reason: string;
  risks: string[];
};

export type FinalMatchResult = LegacyFinalMatch;

export type SourceSummary = {
  audioPlatformCount: number;
  ebookPlatformCount: number;
  searchEngineCount: number;
  socialMediaCount: number;
  unknownCount: number;
  authorMatchCount: number;
};

export type WorkIdentificationResult = {
  candidates: CandidateWork[];
  finalMatch: FinalMatch | null;
  confidence: number;
  reason: string;
  risks: string[];
  final: LegacyFinalMatch;
  searchProvider: string;
  searchQuery: string;
  searchResults: SearchResultItem[];
  evidence: SearchEvidence[];
  riskHints: string[];
  sourceSummary: SourceSummary;
};

export interface SearchAdapter {
  identifyWork(work: SearchWorkInput | LegacySearchWorkInput): Promise<WorkIdentificationResult>;
}

export const MockSearchProvider: SearchProvider = {
  name: "mock",
  async search(_query, work) {
    const normalized = normalizeInput(work);

    return buildMockSearchResults(normalized);
  },
};

export const RealSearchProvider: SearchProvider = {
  name: "real",
  async search(query, _work, config) {
    if (!config.baseUrl) {
      throw new Error("SEARCH_BASE_URL 未配置，无法使用真实搜索 provider。");
    }
    if (!config.apiKey) {
      throw new Error("SEARCH_API_KEY 未配置，无法使用真实搜索 provider。");
    }

    if (isQianfanWebSearchUrl(config.baseUrl)) {
      return searchQianfanWeb(query, config);
    }

    const url = new URL(config.baseUrl);
    url.searchParams.set("q", query);
    url.searchParams.set("limit", String(config.maxResults));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`真实搜索请求失败：HTTP ${response.status}`);
      }

      return normalizeProviderResults(await response.json(), config.maxResults);
    } finally {
      clearTimeout(timer);
    }
  },
};

async function searchQianfanWeb(query: string, config: SearchProviderConfig): Promise<SearchResultItem[]> {
  if (!config.baseUrl || !config.apiKey) {
    throw new Error("SEARCH_BASE_URL 或 SEARCH_API_KEY 未配置。");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(config.baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "X-Appbuilder-Authorization": `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: truncateSearchQuery(query),
          },
        ],
        search_source: "baidu_search_v2",
        resource_type_filter: [{ type: "web", top_k: config.maxResults }],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`百度千帆搜索请求失败：HTTP ${response.status}`);
    }

    const payload = await response.json();

    return normalizeProviderResults(payload, config.maxResults);
  } finally {
    clearTimeout(timer);
  }
}

export const MockSearchAdapter: SearchAdapter = {
  async identifyWork(work) {
    return identifyWorkWithMock(work);
  },
};

export const mockSearchAdapter = {
  ...MockSearchAdapter,
  async recognizeWork(work: { title: string; description: string }): Promise<RecognitionResult> {
    const isModern = work.title.includes("离婚") || work.description.includes("都市");

    return {
      category: isModern ? "都市情感" : "女频爽文",
      marketTags: isModern ? ["复合", "逆袭", "强情绪"] : ["重生", "逆袭", "强钩子"],
      similarTitlePattern: isModern ? "离婚后 + 反转关系 + 高情绪" : "身份反转 + 命运重启 + 爽点承诺",
    };
  },
};

export function getSearchProviderConfig(): SearchProviderConfig {
  const provider = normalizeProvider(process.env.SEARCH_PROVIDER);

  return {
    provider,
    apiKey: process.env.SEARCH_API_KEY?.trim() || null,
    baseUrl: process.env.SEARCH_BASE_URL?.trim() || null,
    timeoutMs: parsePositiveInteger(process.env.SEARCH_TIMEOUT_MS, 30_000),
    maxResults: Math.min(parsePositiveInteger(process.env.SEARCH_MAX_RESULTS, 10), 20),
  };
}

export async function identifyWorkWithConfiguredProvider(
  input: SearchWorkInput | LegacySearchWorkInput,
): Promise<WorkIdentificationResult> {
  const work = normalizeInput(input);
  const config = getSearchProviderConfig();
  const query = buildSearchQuery(work);

  if (config.provider === "mock") {
    return identifyWorkFromSearchResults(work, query, await MockSearchProvider.search(query, work, config), "mock");
  }

  try {
    return identifyWorkFromSearchResults(
      work,
      query,
      await RealSearchProvider.search(query, work, config),
      config.provider,
    );
  } catch (error) {
    const fallback = identifyWorkFromSearchResults(work, query, await MockSearchProvider.search(query, work, config), "mock");
    const message = error instanceof Error ? error.message : "真实搜索失败，已回退 Mock。";

    return {
      ...fallback,
      reason: `${fallback.reason}；真实搜索失败，已回退 Mock。`,
      risks: Array.from(new Set([...fallback.risks, "真实搜索失败，当前结果来自 Mock fallback"])),
      riskHints: Array.from(new Set([...fallback.riskHints, message])),
      evidence: [
        {
          title: "真实搜索 fallback",
          detail: message,
          sourceType: "unknown",
          url: null,
          weight: 0,
        },
        ...fallback.evidence,
      ],
    };
  }
}

export async function identifyWorkWithMock(input: SearchWorkInput | LegacySearchWorkInput): Promise<WorkIdentificationResult> {
  const work = normalizeInput(input);
  const query = buildSearchQuery(work);

  return identifyWorkFromSearchResults(work, query, await MockSearchProvider.search(query, work, getSearchProviderConfig()), "mock");
}

export function buildSearchQuery(work: SearchWorkInput): string {
  return [
    work.title,
    work.author || "",
    work.externalId ? `作品ID ${work.externalId}` : "",
    work.category || "",
    "有声书 小说",
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function identifyWorkFromSearchResults(
  work: SearchWorkInput,
  query: string,
  results: SearchResultItem[],
  provider: string,
): WorkIdentificationResult {
  const candidates = results
    .map((result) => scoreSearchResultCandidate(work, result))
    .sort((left, right) => right.score - left.score);
  const best = candidates[0] ?? null;
  const finalMatch = best ? { title: best.title, author: best.author } : null;
  const confidence = best?.score ?? 0;
  const reason = best ? `最高分候选：${best.matchReasons.join("；")}` : "未获得候选作品。";
  const risks = buildRisks(best);
  const evidence = buildEvidence(candidates);
  const riskHints = Array.from(new Set([...risks, ...candidates.flatMap((candidate) => candidate.riskHints ?? [])]));
  const sourceSummary = summarizeSources(candidates);

  return {
    candidates,
    finalMatch,
    confidence,
    reason,
    risks,
    final: {
      matchedTitle: finalMatch?.title ?? "",
      matchedAuthor: finalMatch?.author ?? "",
      confidence,
      reason,
      risks,
    },
    searchProvider: provider,
    searchQuery: query,
    searchResults: results,
    evidence,
    riskHints,
    sourceSummary,
  };
}

function normalizeInput(input: SearchWorkInput | LegacySearchWorkInput): SearchWorkInput {
  const intro = "description" in input ? input.description : input.intro;
  const remark = "notes" in input ? input.notes : "remark" in input ? input.remark : null;

  return {
    title: input.title.trim(),
    author: input.author?.trim() || null,
    intro: (intro || "").trim(),
    category: input.category?.trim() || null,
    coverFileName: input.coverFileName?.trim() || null,
    remark: (remark || "").trim() || null,
    externalId: input.externalId?.trim() || null,
  };
}

function buildMockSearchResults(work: SearchWorkInput): SearchResultItem[] {
  const author = work.author || "未知作者";
  const category = work.category || "通用品类";
  const keyword = extractKeywords(work.intro)[0] || category;

  return [
    {
      title: work.title,
      url: null,
      snippet: `${category}有声书，简介关键词：${keyword}。`,
      sourceName: "番茄畅听",
      sourceType: "audio_platform",
      matchedTitle: work.title,
      matchedAuthor: author,
      confidenceHint: 92,
      riskHints: [],
      rawRank: 1,
    },
    {
      title: `${work.title} 完整版`,
      url: null,
      snippet: `疑似同作品有声书延展版本，包含${keyword}、反转、成长等元素。`,
      sourceName: "喜马拉雅",
      sourceType: "audio_platform",
      matchedTitle: `${work.title} 完整版`,
      matchedAuthor: author,
      confidenceHint: 82,
      riskHints: ["疑似版本名扩展，需要确认是否为同一作品"],
      rawRank: 2,
    },
    {
      title: work.title.replace("后", "之后") || `${work.title}同名作品`,
      url: null,
      snippet: `标题接近，品类接近${category}，但作者信息存在差异。`,
      sourceName: "懒人听书",
      sourceType: "audio_platform",
      matchedTitle: work.title.replace("后", "之后") || `${work.title}同名作品`,
      matchedAuthor: `${author}工作室`,
      confidenceHint: 58,
      riskHints: ["作者信息不同", "疑似重名"],
      rawRank: 3,
    },
    {
      title: `${work.title.slice(0, Math.max(2, Math.floor(work.title.length / 2)))}往事`,
      url: null,
      snippet: "电子书平台标题局部相似，简介和作者均需要人工复核。",
      sourceName: "七猫免费小说",
      sourceType: "ebook_platform",
      matchedTitle: null,
      matchedAuthor: "平台聚合作者",
      confidenceHint: 35,
      riskHints: ["标题仅局部相似"],
      rawRank: 4,
    },
  ];
}

function scoreSearchResultCandidate(work: SearchWorkInput, result: SearchResultItem): CandidateWork {
  const candidateTitle = result.matchedTitle || result.title;
  const candidateAuthor = result.matchedAuthor || "未知作者";
  const titleScore = similarity(work.title, candidateTitle);
  const authorMatches = Boolean(work.author && normalizeText(work.author) === normalizeText(candidateAuthor));
  const keywordScore = keywordOverlap(work.intro, result.snippet);
  const sourceWeight = sourceTypeWeight(result.sourceType);
  const possibleDuplicate = titleScore > 0.78 && !authorMatches;
  const hintScore = result.confidenceHint ?? 0;
  const score = clampScore(
    Math.round(
      titleScore * 42 +
        (authorMatches ? 22 : 0) +
        keywordScore * 16 +
        sourceWeight * 12 +
        hintScore * 0.08 -
        (possibleDuplicate ? 10 : 0),
    ),
  );
  const matchReasons = [
    `书名相似度 ${Math.round(titleScore * 100)}%`,
    authorMatches ? "作者一致" : "作者未确认或不一致",
    `简介关键词重合 ${Math.round(keywordScore * 100)}%`,
    `来源类型：${sourceTypeLabel(result.sourceType)}`,
    result.sourceType === "audio_platform" ? "有声书平台证据优先参考" : "",
  ].filter(Boolean);
  const excludeReasons = [
    !authorMatches ? "作者信息不同或缺失" : "",
    possibleDuplicate ? "疑似重名" : "",
    keywordScore < 0.2 ? "简介关键词重合较低" : "",
    ...result.riskHints,
  ].filter(Boolean);

  return {
    title: candidateTitle,
    candidateTitle,
    author: candidateAuthor,
    platform: result.sourceName,
    sourcePlatform: result.sourceName,
    summary: result.snippet,
    score,
    matchReasons,
    excludeReasons,
    possibleDuplicate,
    matchReason: matchReasons.join("；"),
    excludeReason: excludeReasons.length ? excludeReasons.join("；") : "暂无明显排除理由",
    suspectedSameName: possibleDuplicate,
    url: result.url,
    snippet: result.snippet,
    sourceName: result.sourceName,
    sourceType: result.sourceType,
    matchedTitle: result.matchedTitle,
    matchedAuthor: result.matchedAuthor,
    confidenceHint: result.confidenceHint,
    riskHints: result.riskHints,
    rawRank: result.rawRank,
  };
}

function normalizeProviderResults(payload: unknown, maxResults: number): SearchResultItem[] {
  const records = extractResultArray(payload).slice(0, maxResults);

  return records.map((record, index) => {
    const item = record && typeof record === "object" ? (record as Record<string, unknown>) : {};
    const sourceType = normalizeSourceType(stringValue(item.sourceType) || stringValue(item.type));

    return {
      title: stringValue(item.title) || stringValue(item.name) || "未命名搜索结果",
      url: stringValue(item.url) || stringValue(item.link) || null,
      snippet: stringValue(item.snippet) || stringValue(item.content) || stringValue(item.summary) || stringValue(item.description) || "",
      sourceName:
        stringValue(item.sourceName) ||
        stringValue(item.website) ||
        stringValue(item.web_anchor) ||
        stringValue(item.source) ||
        stringValue(item.platform) ||
        "未知来源",
      sourceType,
      matchedTitle: stringValue(item.matchedTitle) || null,
      matchedAuthor: stringValue(item.matchedAuthor) || stringValue(item.author) || authorNameValue(item.author_info) || null,
      confidenceHint: numberValue(item.confidenceHint) ?? numberValue(item.score),
      riskHints: arrayStringValue(item.riskHints),
      rawRank: numberValue(item.rawRank) ?? index + 1,
    };
  });
}

function extractResultArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  const record = payload as Record<string, unknown>;

  for (const key of ["results", "items", "data", "references"]) {
    if (Array.isArray(record[key])) {
      return record[key];
    }
  }

  return [];
}

function buildEvidence(candidates: CandidateWork[]): SearchEvidence[] {
  return candidates.slice(0, 5).map((candidate) => ({
    title: candidate.title,
    detail: `${candidate.sourceName ?? candidate.platform}：${candidate.matchReason}`,
    sourceType: candidate.sourceType ?? "unknown",
    url: candidate.url ?? null,
    weight: sourceTypeWeight(candidate.sourceType ?? "unknown"),
  }));
}

function summarizeSources(candidates: CandidateWork[]): SourceSummary {
  return {
    audioPlatformCount: candidates.filter((item) => item.sourceType === "audio_platform").length,
    ebookPlatformCount: candidates.filter((item) => item.sourceType === "ebook_platform").length,
    searchEngineCount: candidates.filter((item) => item.sourceType === "search_engine").length,
    socialMediaCount: candidates.filter((item) => item.sourceType === "social_media").length,
    unknownCount: candidates.filter((item) => !item.sourceType || item.sourceType === "unknown").length,
    authorMatchCount: candidates.filter((item) => item.matchReasons.includes("作者一致")).length,
  };
}

function buildRisks(best: CandidateWork | null): string[] {
  if (!best) {
    return ["无候选结果"];
  }

  return [
    best.possibleDuplicate ? "疑似重名，需要人工确认" : "",
    best.score < 70 ? "匹配置信度偏低" : "",
    ...best.excludeReasons,
  ].filter(Boolean);
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replaceAll(/\s+/g, "");
}

function similarity(left: string, right: string): number {
  const leftTokens = Array.from(new Set(normalizeText(left)));
  const rightTokens = new Set(normalizeText(right));

  if (leftTokens.length === 0 || rightTokens.size === 0) {
    return 0;
  }

  const matched = leftTokens.filter((token) => rightTokens.has(token)).length;
  return matched / Math.max(leftTokens.length, rightTokens.size);
}

function extractKeywords(text: string): string[] {
  return Array.from(new Set(text.replace(/[，。！？、,.!?]/g, " ").split(/\s+/).filter((word) => word.length >= 2))).slice(0, 8);
}

function keywordOverlap(left: string, right: string): number {
  const leftKeywords = extractKeywords(left);
  const rightText = right.toLowerCase();

  if (leftKeywords.length === 0) {
    return 0;
  }

  return leftKeywords.filter((keyword) => rightText.includes(keyword.toLowerCase())).length / leftKeywords.length;
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}

function sourceTypeWeight(sourceType: SearchSourceType): number {
  if (sourceType === "audio_platform") return 1;
  if (sourceType === "ebook_platform") return 0.65;
  if (sourceType === "search_engine" || sourceType === "social_media") return 0.35;
  return 0.15;
}

function sourceTypeLabel(sourceType: SearchSourceType): string {
  const labels: Record<SearchSourceType, string> = {
    audio_platform: "有声书平台",
    ebook_platform: "电子书平台",
    search_engine: "搜索引擎",
    social_media: "社交媒体",
    unknown: "未知来源",
  };

  return labels[sourceType];
}

function normalizeSourceType(value: string): SearchSourceType {
  if (value === "web" || value === "search") {
    return "search_engine";
  }
  if (value === "audio_platform" || value === "ebook_platform" || value === "search_engine" || value === "social_media") {
    return value;
  }

  return "unknown";
}

function normalizeProvider(value: string | undefined): SearchProviderConfig["provider"] {
  return value === "real" || value === "custom" ? value : "mock";
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : fallback;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown): number | null {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function arrayStringValue(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function authorNameValue(value: unknown): string {
  if (!value || typeof value !== "object") {
    return "";
  }

  return stringValue((value as Record<string, unknown>).name);
}

function isQianfanWebSearchUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return url.hostname === "qianfan.baidubce.com" && url.pathname.includes("/v2/ai_search/web_search");
  } catch {
    return false;
  }
}

function truncateSearchQuery(value: string): string {
  return value.trim().slice(0, 60);
}
