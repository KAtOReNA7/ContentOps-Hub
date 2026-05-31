export type SearchSourceType =
  | "audio_platform"
  | "ebook_platform"
  | "video_platform"
  | "social_media"
  | "encyclopedia"
  | "news"
  | "search_engine"
  | "unknown";

export type SearchEvidenceStrength = "high" | "medium" | "low";

export type SearchWorkInput = {
  title: string;
  author: string | null;
  intro: string;
  category: string | null;
  coverFileName: string | null;
  remark: string | null;
  externalId?: string | null;
  contentType?: string | null;
};

type LegacySearchWorkInput = {
  title: string;
  author: string | null;
  description: string;
  category: string | null;
  coverFileName: string | null;
  notes?: string | null;
  externalId?: string | null;
  contentType?: string | null;
};

export type SearchResultItem = {
  title: string;
  url: string | null;
  snippet: string;
  sourceName: string;
  canonicalSourceName: string;
  sourceType: SearchSourceType;
  sourceCategory: SearchSourceType;
  host: string | null;
  matchedTitle: string | null;
  matchedAuthor: string | null;
  confidenceHint: number | null;
  riskHints: string[];
  rawRank: number | null;
  ipEvidence: IpEvidence[];
  heatEvidence: HeatEvidence[];
};

export type IpEvidence = {
  type: "adapted_drama";
  sourceName: string;
  sourceCategory: SearchSourceType;
  evidenceText: string;
  confidence: SearchEvidenceStrength;
};

export type HeatEvidence = {
  sourceName: string;
  sourceCategory: SearchSourceType;
  evidenceText: string;
  strength: SearchEvidenceStrength;
};

export type SearchFilterSummary = {
  rawResultCount: number;
  normalizedResultCount: number;
  filteredResultCount: number;
  filterReasons: string[];
  baseURLHost: string | null;
  httpStatus: number | null;
  excludedResults?: ExcludedSearchResult[];
};

export type ExcludedSearchResult = {
  title: string;
  url: string | null;
  sourceName: string;
  canonicalSourceName?: string;
  sourceCategory?: SearchSourceType;
  snippet: string;
  relevanceScore: number;
  valueSignalScore: number;
  filterReasons: string[];
  ipEvidenceCount: number;
  heatEvidenceCount: number;
};

export type SearchProviderResponse = {
  items: SearchResultItem[];
  summary: SearchFilterSummary;
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
  expandedQueryLimit: number;
  queryDelayMs: number;
  retry429Count: number;
  retry429DelayMs: number;
};

export interface SearchProvider {
  name: string;
  search(query: string, work: SearchWorkInput, config: SearchProviderConfig): Promise<SearchProviderResponse>;
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
  canonicalSourceName?: string;
  sourceCategory?: SearchSourceType;
  host?: string | null;
  matchedTitle?: string | null;
  matchedAuthor?: string | null;
  confidenceHint?: number | null;
  riskHints?: string[];
  rawRank?: number | null;
  ipEvidence?: IpEvidence[];
  heatEvidence?: HeatEvidence[];
  relevanceScore?: number;
  valueSignalScore?: number;
  relevanceReasons?: string[];
  relevanceTags?: string[];
  filteredByRelevance?: boolean;
  relevanceFilterReasons?: string[];
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
  videoPlatformCount?: number;
  socialPlatformCount?: number;
  encyclopediaCount?: number;
  newsCount?: number;
  categorySummary?: Array<{
    sourceCategory: SearchSourceType;
    platformCount: number;
    resultCount: number;
  }>;
  platformSummary?: Array<{
    canonicalSourceName: string;
    sourceCategory: SearchSourceType;
    resultCount: number;
  }>;
  ipEvidenceCount?: number;
  heatEvidenceCount?: number;
  ipEvidence?: IpEvidence[];
  heatEvidence?: HeatEvidence[];
  excludedResults?: ExcludedSearchResult[];
  excludedIpEvidenceCount?: number;
  excludedHeatEvidenceCount?: number;
  rawResultCount?: number;
  normalizedResultCount?: number;
  filteredResultCount?: number;
  filterReasons?: string[];
  baseURLHost?: string | null;
  httpStatus?: number | null;
  requestedProviderMode?: SearchProviderMode;
  configuredProvider?: string;
  searchFallback?: boolean;
};

export type SearchProviderMode = "mock" | "configured";

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
    const items = buildMockSearchResults(normalized);

    return {
      items,
      summary: {
        rawResultCount: items.length,
        normalizedResultCount: items.length,
        filteredResultCount: 0,
        filterReasons: [],
        baseURLHost: null,
        httpStatus: 200,
      },
    };
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

      return normalizeProviderResults(await response.json(), config.maxResults, {
        baseURLHost: safeHost(config.baseUrl),
        httpStatus: response.status,
      });
    } finally {
      clearTimeout(timer);
    }
  },
};

async function searchQianfanWeb(query: string, config: SearchProviderConfig): Promise<SearchProviderResponse> {
  if (!config.baseUrl || !config.apiKey) {
    throw new Error("SEARCH_BASE_URL 或 SEARCH_API_KEY 未配置。");
  }

  for (let attempt = 0; attempt <= config.retry429Count; attempt++) {
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

      if (response.status === 429 && attempt < config.retry429Count) {
        await sleep(getRetryAfterMs(response.headers.get("retry-after"), config.retry429DelayMs));
        continue;
      }

      if (!response.ok) {
        throw new Error(
          response.status === 429
            ? "百度千帆搜索请求失败：HTTP 429。请求触发限流或账号额度不足，请稍后重试，或检查百度千帆配额。"
            : `百度千帆搜索请求失败：HTTP ${response.status}`,
        );
      }

      const payload = await response.json();

      return normalizeProviderResults(payload, config.maxResults, {
        baseURLHost: safeHost(config.baseUrl),
        httpStatus: response.status,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error("百度千帆搜索请求失败：HTTP 429。请求触发限流或账号额度不足。");
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
    expandedQueryLimit: Math.min(parsePositiveInteger(process.env.SEARCH_EXPANDED_QUERY_LIMIT, 1), 4),
    queryDelayMs: parsePositiveInteger(process.env.SEARCH_QUERY_DELAY_MS, 800),
    retry429Count: Math.min(parseNonNegativeInteger(process.env.SEARCH_429_RETRY_COUNT, 1), 3),
    retry429DelayMs: parsePositiveInteger(process.env.SEARCH_429_RETRY_DELAY_MS, 1_500),
  };
}

export async function identifyWorkWithConfiguredProvider(
  input: SearchWorkInput | LegacySearchWorkInput,
): Promise<WorkIdentificationResult> {
  const work = normalizeInput(input);
  const config = getSearchProviderConfig();
  const query = buildSearchQuery(work);

  if (config.provider === "mock") {
    const result = identifyWorkFromSearchResults(work, query, await MockSearchProvider.search(query, work, config), "mock");

    return {
      ...result,
      risks: Array.from(new Set([...result.risks, "当前环境 SEARCH_PROVIDER=mock，本次未调用真实搜索。"])),
      riskHints: Array.from(new Set([...result.riskHints, "当前环境 SEARCH_PROVIDER=mock，本次未调用真实搜索。"])),
      sourceSummary: {
        ...result.sourceSummary,
        requestedProviderMode: "configured",
        configuredProvider: config.provider,
        searchFallback: false,
      },
    };
  }

  try {
    const response = await searchWithExpandedQueries(work, config);

    const result = identifyWorkFromSearchResults(
      work,
      query,
      response,
      config.provider,
    );

    return {
      ...result,
      sourceSummary: {
        ...result.sourceSummary,
        requestedProviderMode: "configured",
        configuredProvider: config.provider,
        searchFallback: false,
      },
    };
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
      sourceSummary: {
        ...fallback.sourceSummary,
        requestedProviderMode: "configured",
        configuredProvider: config.provider,
        searchFallback: true,
      },
    };
  }
}

export async function identifyWorkWithMock(input: SearchWorkInput | LegacySearchWorkInput): Promise<WorkIdentificationResult> {
  const work = normalizeInput(input);
  const query = buildSearchQuery(work);

  const result = identifyWorkFromSearchResults(work, query, await MockSearchProvider.search(query, work, getSearchProviderConfig()), "mock");

  return {
    ...result,
    sourceSummary: {
      ...result.sourceSummary,
      requestedProviderMode: "mock",
      configuredProvider: "mock",
      searchFallback: false,
    },
  };
}

export function identifyWorkWithProviderMode(
  input: SearchWorkInput | LegacySearchWorkInput,
  options: { searchProviderMode: SearchProviderMode },
): Promise<WorkIdentificationResult> {
  return options.searchProviderMode === "configured"
    ? identifyWorkWithConfiguredProvider(input)
    : identifyWorkWithMock(input);
}

export function applyCandidateRelevanceGate(
  input: SearchWorkInput | LegacySearchWorkInput,
  candidates: CandidateWork[],
  sourceSummary: SourceSummary | null,
): { candidates: CandidateWork[]; sourceSummary: SourceSummary } {
  const work = normalizeInput(input);
  const rescored = candidates
    .map((candidate) => scoreSearchResultCandidate(work, candidateToSearchResult(candidate)))
    .sort((left, right) => right.score - left.score);
  const passed = rescored.filter((candidate) => !candidate.filteredByRelevance);
  const excluded = rescored.filter((candidate) => candidate.filteredByRelevance).map(candidateToExcludedResult);

  return {
    candidates: passed,
    sourceSummary: summarizeSources(passed, {
      rawResultCount: sourceSummary?.rawResultCount ?? candidates.length,
      normalizedResultCount: passed.length,
      filteredResultCount: (sourceSummary?.filteredResultCount ?? 0) + excluded.length,
      filterReasons: summarizeFilterReasons([...(sourceSummary?.filterReasons ?? []), ...excluded.flatMap((item) => item.filterReasons)]),
      baseURLHost: sourceSummary?.baseURLHost ?? null,
      httpStatus: sourceSummary?.httpStatus ?? null,
      excludedResults: [...(sourceSummary?.excludedResults ?? []), ...excluded],
    }),
  };
}

export function buildSearchQuery(work: SearchWorkInput): string {
  return [
    work.title,
    work.author || "",
    work.externalId ? `作品ID ${work.externalId}` : "",
    work.category || "",
    work.contentType || "",
    "有声书 小说",
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildExpandedSearchQueries(work: SearchWorkInput): string[] {
  const base = [work.title, work.author || ""].filter(Boolean).join(" ").trim();
  const queries = [
    buildSearchQuery(work),
    `${base} 小说 原著 晋江`,
    `${work.title} 改编 影视原著 电视剧 网剧 芒果TV`,
    `${work.title} 微博 抖音 百度百科 豆瓣`,
  ]
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  return Array.from(new Set(queries));
}

async function searchWithExpandedQueries(
  work: SearchWorkInput,
  config: SearchProviderConfig,
): Promise<SearchProviderResponse> {
  const queries = buildExpandedSearchQueries(work).slice(0, config.expandedQueryLimit);
  const responses: SearchProviderResponse[] = [];
  const failedReasons: string[] = [];

  for (const [index, query] of queries.entries()) {
    if (index > 0) {
      await sleep(config.queryDelayMs);
    }

    try {
      responses.push(await RealSearchProvider.search(query, work, config));
    } catch (error) {
      failedReasons.push(`扩展 query 失败：${sanitizeSearchError(error)}`);
    }
  }

  if (!responses.length) {
    throw new Error(failedReasons.join("；") || "真实搜索请求失败");
  }

  const items = dedupeSearchResults(responses.flatMap((response) => response.items));
  const rawResultCount = responses.reduce((sum, response) => sum + response.summary.rawResultCount, 0);
  const filteredResultCount = Math.max(0, rawResultCount - items.length);
  const filterReasons = summarizeFilterReasons([...responses.flatMap((response) => response.summary.filterReasons), ...failedReasons]);

  return {
    items,
    summary: {
      rawResultCount,
      normalizedResultCount: items.length,
      filteredResultCount,
      filterReasons,
      baseURLHost: responses[0]?.summary.baseURLHost ?? safeHost(config.baseUrl),
      httpStatus: responses.find((response) => response.summary.httpStatus)?.summary.httpStatus ?? null,
    },
  };
}

function dedupeSearchResults(items: SearchResultItem[]): SearchResultItem[] {
  const seen = new Set<string>();
  const result: SearchResultItem[] = [];

  for (const item of items) {
    const key = item.url || `${item.title}-${item.sourceName}-${item.snippet.slice(0, 40)}`;

    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }

  return result;
}

function identifyWorkFromSearchResults(
  work: SearchWorkInput,
  query: string,
  response: SearchProviderResponse,
  provider: string,
): WorkIdentificationResult {
  const results = response.items;
  const candidates = results
    .map((result) => scoreSearchResultCandidate(work, result))
    .sort((left, right) => right.score - left.score);
  const passedCandidates = candidates.filter((candidate) => !candidate.filteredByRelevance);
  const excludedResults = candidates
    .filter((candidate) => candidate.filteredByRelevance)
    .map(candidateToExcludedResult);
  const bestPassed = passedCandidates[0] ?? null;
  const finalMatch = bestPassed ? { title: bestPassed.title, author: bestPassed.author } : null;
  const confidence = bestPassed?.score ?? 0;
  const reason = bestPassed ? `最高分候选：${bestPassed.matchReasons.join("；")}` : "未获得候选作品。";
  const risks = buildRisks(bestPassed);
  const evidence = buildEvidence(passedCandidates);
  const riskHints = Array.from(new Set([...risks, ...passedCandidates.flatMap((candidate) => candidate.riskHints ?? [])]));
  const sourceSummary = summarizeSources(passedCandidates, {
    ...response.summary,
    filteredResultCount: (response.summary.filteredResultCount ?? 0) + excludedResults.length,
    filterReasons: summarizeFilterReasons([...response.summary.filterReasons, ...excludedResults.flatMap((item) => item.filterReasons)]),
    excludedResults,
  });

  return {
    candidates: passedCandidates,
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
    contentType: input.contentType?.trim() || "web_novel",
  };
}

function buildMockSearchResults(work: SearchWorkInput): SearchResultItem[] {
  const author = work.author || "未知作者";
  const category = work.category || "通用品类";
  const keyword = extractKeywords(work.intro)[0] || category;

  return [
    {
      title: work.title,
      url: `https://fanqienovel.com/search/${encodeURIComponent(work.title)}`,
      snippet: `${category}有声书，简介关键词：${keyword}。`,
      sourceName: "番茄畅听",
      canonicalSourceName: "番茄小说",
      sourceType: "audio_platform",
      sourceCategory: "audio_platform",
      host: "fanqienovel.com",
      matchedTitle: work.title,
      matchedAuthor: author,
      confidenceHint: 92,
      riskHints: [],
      rawRank: 1,
      ipEvidence: [],
      heatEvidence: [],
    },
    {
      title: `${work.title} 完整版`,
      url: `https://www.ximalaya.com/search/${encodeURIComponent(work.title)}`,
      snippet: `疑似同作品有声书延展版本，包含${keyword}、反转、成长等元素。`,
      sourceName: "喜马拉雅",
      canonicalSourceName: "喜马拉雅",
      sourceType: "audio_platform",
      sourceCategory: "audio_platform",
      host: "www.ximalaya.com",
      matchedTitle: `${work.title} 完整版`,
      matchedAuthor: author,
      confidenceHint: 82,
      riskHints: ["疑似版本名扩展，需要确认是否为同一作品"],
      rawRank: 2,
      ipEvidence: [],
      heatEvidence: [],
    },
    {
      title: work.title.replace("后", "之后") || `${work.title}同名作品`,
      url: `https://www.lrts.me/search/book/${encodeURIComponent(work.title)}`,
      snippet: `标题接近，品类接近${category}，但作者信息存在差异。`,
      sourceName: "懒人听书",
      canonicalSourceName: "懒人听书",
      sourceType: "audio_platform",
      sourceCategory: "audio_platform",
      host: "www.lrts.me",
      matchedTitle: work.title.replace("后", "之后") || `${work.title}同名作品`,
      matchedAuthor: `${author}工作室`,
      confidenceHint: 58,
      riskHints: ["作者信息不同", "疑似重名"],
      rawRank: 3,
      ipEvidence: [],
      heatEvidence: [],
    },
    {
      title: `${work.title.slice(0, Math.max(2, Math.floor(work.title.length / 2)))}往事`,
      url: `https://www.qimao.com/search/?keyword=${encodeURIComponent(work.title)}`,
      snippet: "电子书平台标题局部相似，简介和作者均需要人工复核。",
      sourceName: "七猫免费小说",
      canonicalSourceName: "七猫小说",
      sourceType: "ebook_platform",
      sourceCategory: "ebook_platform",
      host: "www.qimao.com",
      matchedTitle: null,
      matchedAuthor: "平台聚合作者",
      confidenceHint: 35,
      riskHints: ["标题仅局部相似"],
      rawRank: 4,
      ipEvidence: [],
      heatEvidence: [],
    },
  ];
}

function scoreSearchResultCandidate(work: SearchWorkInput, result: SearchResultItem): CandidateWork {
  const candidateTitle = result.matchedTitle || result.title;
  const authorEvidence = resolveCandidateAuthor(work, result);
  const candidateAuthor = authorEvidence.author || "未知作者";
  const titleScore = similarity(work.title, candidateTitle);
  const authorMatches = authorEvidence.match;
  const authorMismatch = authorEvidence.mismatch;
  const keywordScore = keywordOverlap(work.intro, result.snippet);
  const sourceWeight = sourceTypeWeight(result.sourceType);
  const possibleDuplicate = titleScore > 0.78 && authorMismatch;
  const hintScore = result.confidenceHint ?? 0;
  const relevance = scoreSearchRelevance(work, result, {
    authorMatches,
    authorMismatch,
    keywordScore,
  });
  const valueSignalScore = scoreValueSignal(result);
  const filteredByRelevance = relevance.score < 35 || relevance.hardFilter;
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
    authorEvidence.reason,
    `简介关键词重合 ${Math.round(keywordScore * 100)}%`,
    result.sourceCategory === "audio_platform" ? "有声书平台证据优先参考" : "",
    result.ipEvidence.length ? `本地初筛发现可能的改编关键词 ${result.ipEvidence.length} 条，需由 OpenAI 结合原文确认` : "",
    result.heatEvidence.length ? `本地初筛发现可能的热度关键词 ${result.heatEvidence.length} 条，需由 OpenAI 结合原文确认` : "",
    `相关性 ${relevance.score}/100`,
  ].filter(Boolean);
  const normalizedRiskHints = authorMatches
    ? result.riskHints.filter((hint) => !/作者.*(不同|缺失|不一致)/.test(hint))
    : result.riskHints;
  const excludeReasons = [
    authorMismatch ? "导入作者与搜索结果作者明确不一致" : "",
    possibleDuplicate ? "疑似重名" : "",
    keywordScore < 0.2 ? "简介关键词重合较低" : "",
    ...normalizedRiskHints,
  ].filter(Boolean);

  return {
    title: candidateTitle,
    candidateTitle,
    author: candidateAuthor,
    platform: result.sourceName,
    sourcePlatform: result.canonicalSourceName,
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
    canonicalSourceName: result.canonicalSourceName,
    sourceCategory: result.sourceCategory,
    host: result.host,
    matchedTitle: result.matchedTitle,
    matchedAuthor: authorEvidence.author,
    confidenceHint: result.confidenceHint,
    riskHints: normalizedRiskHints,
    rawRank: result.rawRank,
    ipEvidence: result.ipEvidence,
    heatEvidence: result.heatEvidence,
    relevanceScore: relevance.score,
    valueSignalScore,
    relevanceReasons: relevance.reasons,
    relevanceTags: relevance.tags,
    filteredByRelevance,
    relevanceFilterReasons: filteredByRelevance ? relevance.filterReasons : [],
  };
}

export function normalizeProviderResults(
  payload: unknown,
  maxResults: number,
  context: { baseURLHost?: string | null; httpStatus?: number | null } = {},
): SearchProviderResponse {
  const records = extractResultArray(payload);
  const items: SearchResultItem[] = [];
  const filterReasons: string[] = [];

  for (const [index, record] of records.entries()) {
    if (items.length >= maxResults) {
      break;
    }
    const item = record && typeof record === "object" ? (record as Record<string, unknown>) : {};
    const url = stringValue(item.url) || stringValue(item.link) || stringValue(item.href);
    const host = safeHost(url);

    if (!host) {
      filterReasons.push("URL 缺失或无法解析");
      continue;
    }

    const platform = normalizeSourcePlatform(url, item);
    const sourceName = platform.canonicalSourceName;

    if (!sourceName) {
      filterReasons.push("无法解析来源平台");
      continue;
    }

    const sourceType = normalizeSourceType(
      stringValue(item.sourceType) || stringValue(item.type) || platform.sourceCategory,
    );
    const snippet =
      stringValue(item.snippet) ||
      stringValue(item.content) ||
      stringValue(item.summary) ||
      stringValue(item.description) ||
      stringValue(item.abstract) ||
      "";
    const title = stringValue(item.title) || stringValue(item.name) || "未命名搜索结果";
    const textForAuthor = [
      title,
      snippet,
      stringValue(item.description),
      stringValue(item.summary),
      stringValue(item.content),
    ].join(" ");
    const extractedAuthor = extractAuthorCandidates(textForAuthor)[0] || "";
    const ipEvidence = extractIpEvidence({
      title,
      snippet,
      sourceName,
      sourceCategory: platform.sourceCategory,
      url,
    });
    const heatEvidence = extractHeatEvidence({
      title,
      snippet,
      sourceName,
      sourceCategory: platform.sourceCategory,
      url,
    });

    items.push({
      title,
      url,
      snippet,
      sourceName,
      canonicalSourceName: sourceName,
      sourceType,
      sourceCategory: platform.sourceCategory,
      host,
      matchedTitle: stringValue(item.matchedTitle) || null,
      matchedAuthor:
        stringValue(item.matchedAuthor) ||
        stringValue(item.author) ||
        authorNameValue(item.author_info) ||
        extractedAuthor ||
        null,
      confidenceHint: numberValue(item.confidenceHint) ?? numberValue(item.score),
      riskHints: arrayStringValue(item.riskHints),
      rawRank: numberValue(item.rawRank) ?? index + 1,
      ipEvidence,
      heatEvidence,
    });
  }

  return {
    items,
    summary: {
      rawResultCount: records.length,
      normalizedResultCount: items.length,
      filteredResultCount: records.length - items.length,
      filterReasons: summarizeFilterReasons(filterReasons),
      baseURLHost: context.baseURLHost ?? null,
      httpStatus: context.httpStatus ?? null,
    },
  };
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
  const candidateEvidence = candidates.slice(0, 5).map((candidate) => ({
    title: candidate.title,
    detail: `${candidate.sourceName ?? candidate.platform}：${candidate.matchReason}`,
    sourceType: candidate.sourceCategory ?? candidate.sourceType ?? "unknown",
    url: candidate.url ?? null,
    weight: sourceTypeWeight(candidate.sourceCategory ?? candidate.sourceType ?? "unknown"),
  }));
  return candidateEvidence;
}

function summarizeSources(candidates: CandidateWork[], filterSummary?: SearchFilterSummary): SourceSummary {
  const platformSummary = summarizePlatforms(candidates);
  const categorySummary = summarizeCategories(platformSummary);
  const ipEvidence = candidates.flatMap((item) => item.ipEvidence ?? []);
  const heatEvidence = candidates.flatMap((item) => item.heatEvidence ?? []);
  const excludedResults = filterSummary?.excludedResults ?? [];

  return {
    audioPlatformCount: candidates.filter((item) => item.sourceCategory === "audio_platform" || item.sourceType === "audio_platform").length,
    ebookPlatformCount: candidates.filter((item) => item.sourceCategory === "ebook_platform" || item.sourceType === "ebook_platform").length,
    searchEngineCount: candidates.filter((item) => item.sourceCategory === "search_engine" || item.sourceType === "search_engine").length,
    socialMediaCount: candidates.filter((item) => item.sourceCategory === "social_media" || item.sourceType === "social_media").length,
    unknownCount: candidates.filter((item) => !item.sourceCategory || item.sourceCategory === "unknown").length,
    authorMatchCount: candidates.filter((item) => item.matchReasons.some((reason) => reason.includes("作者匹配"))).length,
    videoPlatformCount: candidates.filter((item) => item.sourceCategory === "video_platform").length,
    socialPlatformCount: candidates.filter((item) => item.sourceCategory === "social_media").length,
    encyclopediaCount: candidates.filter((item) => item.sourceCategory === "encyclopedia").length,
    newsCount: candidates.filter((item) => item.sourceCategory === "news").length,
    categorySummary,
    platformSummary,
    ipEvidenceCount: ipEvidence.length,
    heatEvidenceCount: heatEvidence.length,
    ipEvidence: dedupeEvidence(ipEvidence, (item) => `${item.sourceName}-${item.evidenceText}`),
    heatEvidence: dedupeEvidence(heatEvidence, (item) => `${item.sourceName}-${item.evidenceText}`),
    excludedResults,
    excludedIpEvidenceCount: excludedResults.reduce((sum, item) => sum + item.ipEvidenceCount, 0),
    excludedHeatEvidenceCount: excludedResults.reduce((sum, item) => sum + item.heatEvidenceCount, 0),
    rawResultCount: filterSummary?.rawResultCount,
    normalizedResultCount: candidates.length,
    filteredResultCount: filterSummary?.filteredResultCount,
    filterReasons: filterSummary?.filterReasons,
    baseURLHost: filterSummary?.baseURLHost,
    httpStatus: filterSummary?.httpStatus,
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

function scoreSearchRelevance(
  work: SearchWorkInput,
  result: SearchResultItem,
  context: { authorMatches: boolean; authorMismatch: boolean; keywordScore: number },
): { score: number; hardFilter: boolean; reasons: string[]; tags: string[]; filterReasons: string[] } {
  const text = buildSearchResultText(result);
  const titleMatch = scoreTitleRelevance(work.title, text);
  const platformAuthority = ["ebook_platform", "audio_platform", "video_platform", "encyclopedia"].includes(result.sourceCategory);
  let score = 0;
  const reasons: string[] = [];
  const tags: string[] = [];
  const filterReasons: string[] = [];

  if (titleMatch.full) {
    score += 45;
    reasons.push("完整书名命中");
    tags.push("书名命中");
  } else if (titleMatch.partialScore >= 0.65) {
    score += 26;
    reasons.push(`标题关键字部分命中 ${Math.round(titleMatch.partialScore * 100)}%`);
    tags.push("部分书名");
  } else {
    filterReasons.push("标题未命中");
  }

  if (context.authorMatches) {
    score += 35;
    reasons.push("作者命中");
    tags.push("作者命中");
  } else if (context.authorMismatch) {
    score -= 45;
    filterReasons.push("作者明确不一致");
  } else {
    filterReasons.push("作者未命中");
  }

  if (context.keywordScore >= 0.35) {
    score += 15;
    reasons.push(`简介关键词重合 ${Math.round(context.keywordScore * 100)}%`);
    tags.push("简介命中");
  } else if (context.keywordScore >= 0.18) {
    score += 7;
    reasons.push(`简介关键词部分重合 ${Math.round(context.keywordScore * 100)}%`);
    tags.push("简介部分命中");
  } else {
    filterReasons.push("简介关键词重合度低");
  }

  if (platformAuthority && (titleMatch.full || titleMatch.partialScore >= 0.65 || context.authorMatches)) {
    score += 8;
    reasons.push("权威平台且具备书名或作者命中");
  }

  const hardFilter =
    !titleMatch.full &&
    titleMatch.partialScore < 0.65 &&
    !context.authorMatches &&
    context.keywordScore < 0.18 &&
    !platformAuthority;

  if (hardFilter) {
    filterReasons.push("无法证明与当前作品相关");
  }

  return {
    score: clampScore(score),
    hardFilter,
    reasons,
    tags,
    filterReasons: Array.from(new Set(filterReasons)),
  };
}

function scoreTitleRelevance(title: string, text: string): { full: boolean; partialScore: number } {
  const normalizedTitle = normalizeComparable(title);
  const normalizedText = normalizeComparable(text);

  if (!normalizedTitle || !normalizedText) {
    return { full: false, partialScore: 0 };
  }

  if (normalizedText.includes(normalizedTitle)) {
    return { full: true, partialScore: 1 };
  }

  const titleChars = Array.from(new Set(normalizedTitle));
  const textChars = new Set(normalizedText);
  const matched = titleChars.filter((char) => textChars.has(char)).length;

  return { full: false, partialScore: matched / Math.max(titleChars.length, 1) };
}

function normalizeComparable(value: string): string {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

function scoreValueSignal(result: SearchResultItem): number {
  let score = Math.round(sourceTypeWeight(result.sourceCategory) * 20);
  const highIp = result.ipEvidence.some((item) => item.confidence === "high");
  const mediumIp = result.ipEvidence.some((item) => item.confidence === "medium");
  const highHeat = result.heatEvidence.some((item) => item.strength === "high");

  if (highIp) score += 35;
  else if (mediumIp) score += 18;
  if (highHeat) score += 15;
  else if (result.heatEvidence.length) score += 8;

  return clampScore(score);
}

function candidateToExcludedResult(candidate: CandidateWork): ExcludedSearchResult {
  return {
    title: candidate.title,
    url: candidate.url ?? null,
    sourceName: candidate.sourceName ?? candidate.platform,
    canonicalSourceName: candidate.canonicalSourceName,
    sourceCategory: candidate.sourceCategory,
    snippet: candidate.snippet ?? candidate.summary,
    relevanceScore: candidate.relevanceScore ?? 0,
    valueSignalScore: candidate.valueSignalScore ?? 0,
    filterReasons: candidate.relevanceFilterReasons ?? ["相关性不足"],
    ipEvidenceCount: candidate.ipEvidence?.length ?? 0,
    heatEvidenceCount: candidate.heatEvidence?.length ?? 0,
  };
}

function candidateToSearchResult(candidate: CandidateWork): SearchResultItem {
  return {
    title: candidate.candidateTitle || candidate.title,
    url: candidate.url ?? null,
    snippet: candidate.snippet ?? candidate.summary,
    sourceName: candidate.sourceName ?? candidate.platform,
    canonicalSourceName: candidate.canonicalSourceName ?? candidate.sourceName ?? candidate.platform,
    sourceType: candidate.sourceType ?? candidate.sourceCategory ?? "unknown",
    sourceCategory: candidate.sourceCategory ?? candidate.sourceType ?? "unknown",
    host: candidate.host ?? safeHost(candidate.url),
    matchedTitle: candidate.matchedTitle ?? candidate.candidateTitle ?? candidate.title,
    matchedAuthor: candidate.matchedAuthor ?? (candidate.author === "未知作者" ? null : candidate.author),
    confidenceHint: candidate.confidenceHint ?? null,
    riskHints: candidate.riskHints ?? [],
    rawRank: candidate.rawRank ?? null,
    ipEvidence: candidate.ipEvidence ?? [],
    heatEvidence: candidate.heatEvidence ?? [],
  };
}

function summarizePlatforms(candidates: CandidateWork[]): NonNullable<SourceSummary["platformSummary"]> {
  const map = new Map<string, { canonicalSourceName: string; sourceCategory: SearchSourceType; resultCount: number }>();

  for (const candidate of candidates) {
    const canonicalSourceName = candidate.canonicalSourceName || candidate.sourceName || candidate.platform;
    const sourceCategory = candidate.sourceCategory ?? candidate.sourceType ?? "unknown";
    const key = `${canonicalSourceName}-${sourceCategory}`;
    const current = map.get(key);

    if (current) {
      current.resultCount += 1;
    } else {
      map.set(key, { canonicalSourceName, sourceCategory, resultCount: 1 });
    }
  }

  return Array.from(map.values()).sort((left, right) => right.resultCount - left.resultCount);
}

function summarizeCategories(
  platforms: NonNullable<SourceSummary["platformSummary"]>,
): NonNullable<SourceSummary["categorySummary"]> {
  const map = new Map<SearchSourceType, { platforms: Set<string>; resultCount: number }>();

  for (const item of platforms) {
    const current = map.get(item.sourceCategory) ?? { platforms: new Set<string>(), resultCount: 0 };
    current.platforms.add(item.canonicalSourceName);
    current.resultCount += item.resultCount;
    map.set(item.sourceCategory, current);
  }

  return Array.from(map.entries()).map(([sourceCategory, value]) => ({
    sourceCategory,
    platformCount: value.platforms.size,
    resultCount: value.resultCount,
  }));
}

function dedupeEvidence<T>(items: T[], keyOf: (item: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    const key = keyOf(item);

    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }

  return result;
}

function resolveCandidateAuthor(
  work: SearchWorkInput,
  result: SearchResultItem,
): { author: string | null; match: boolean; mismatch: boolean; reason: string } {
  const text = buildSearchResultText(result);
  const importedAuthor = work.author?.trim() || "";
  const extractedAuthors = extractAuthorCandidates(text);
  const directAuthor = result.matchedAuthor?.trim() || null;
  const author = directAuthor || extractedAuthors[0] || null;

  if (importedAuthor && textIncludesName(text, importedAuthor)) {
    const evidence = findAuthorEvidence(text, importedAuthor) ?? importedAuthor;

    return {
      author: importedAuthor,
      match: true,
      mismatch: false,
      reason: `摘要中出现“${evidence}”，作者匹配`,
    };
  }

  if (importedAuthor && author && normalizeText(importedAuthor) === normalizeText(author)) {
    return {
      author,
      match: true,
      mismatch: false,
      reason: `搜索结果作者为“${author}”，作者匹配`,
    };
  }

  if (importedAuthor && author && normalizeText(importedAuthor) !== normalizeText(author)) {
    return {
      author,
      match: false,
      mismatch: true,
      reason: `搜索结果作者为“${author}”，与导入作者“${importedAuthor}”不一致`,
    };
  }

  if (!importedAuthor && author) {
    const evidence = findAuthorEvidence(text, author) ?? author;

    return {
      author,
      match: false,
      mismatch: false,
      reason: `搜索结果中抽取到作者“${author}”（${evidence}）`,
    };
  }

  return {
    author: null,
    match: false,
    mismatch: false,
    reason: "搜索结果未提供明确作者，需人工确认",
  };
}

function buildSearchResultText(result: SearchResultItem): string {
  return [result.title, result.snippet, result.matchedTitle, result.matchedAuthor].filter(Boolean).join(" ");
}

function extractAuthorCandidates(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  const patterns = [
    /作者[：:\s]+([^，。；;、|｜\s]{2,20})/gi,
    /([^，。；;、|｜\s]{2,20})作品/g,
    /([^，。；;、|｜\s]{2,20})著/g,
    /原著[：:\s]*([^，。；;、|｜\s]{2,20})/g,
    /\bby\s+([A-Za-z0-9_\-\u4e00-\u9fa5]{2,30})/gi,
  ];
  const authors: string[] = [];

  for (const pattern of patterns) {
    for (const match of normalized.matchAll(pattern)) {
      const value = cleanupAuthorName(match[1] ?? "");

      if (value && !authors.some((item) => normalizeText(item) === normalizeText(value))) {
        authors.push(value);
      }
    }
  }

  return authors;
}

function cleanupAuthorName(value: string): string {
  return value
    .replace(/^(作者|原著|by)\s*[:：]?/i, "")
    .replace(/(作品|著)$/g, "")
    .replace(/[《》"'“”‘’]/g, "")
    .trim();
}

function textIncludesName(text: string, name: string): boolean {
  return normalizeText(text).includes(normalizeText(name));
}

function findAuthorEvidence(text: string, author: string): string | null {
  const compact = text.replace(/\s+/g, " ");
  const patterns = [
    new RegExp(`作者[：:\\s]+${escapeRegExp(author)}`),
    new RegExp(`${escapeRegExp(author)}作品`),
    new RegExp(`${escapeRegExp(author)}著`),
    new RegExp(`原著[：:\\s]*${escapeRegExp(author)}`),
    new RegExp(`by\\s+${escapeRegExp(author)}`, "i"),
  ];

  for (const pattern of patterns) {
    const match = compact.match(pattern);

    if (match?.[0]) {
      return match[0];
    }
  }

  return null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
  if (sourceType === "video_platform") return 0.9;
  if (sourceType === "encyclopedia" || sourceType === "news") return 0.55;
  if (sourceType === "search_engine" || sourceType === "social_media") return 0.35;
  return 0.15;
}

export function normalizeSourcePlatform(
  url: string,
  rawItemOrSourceName?: Record<string, unknown> | string | null,
): { canonicalSourceName: string; sourceCategory: SearchSourceType; host: string | null } {
  const host = safeHost(url);

  if (!host) {
    return { canonicalSourceName: "", sourceCategory: "unknown", host: null };
  }

  const mapped = platformMappingFromHost(host);

  if (mapped) {
    return { ...mapped, host };
  }

  const rawSourceName =
    typeof rawItemOrSourceName === "string"
      ? rawItemOrSourceName
      : rawItemOrSourceName
        ? explicitSourceName(rawItemOrSourceName)
        : "";

  return {
    canonicalSourceName: rawSourceName && rawSourceName !== "无" ? rawSourceName : host.replace(/^www\./, "").toLowerCase(),
    sourceCategory: inferSourceCategoryFromRawSource(rawSourceName),
    host,
  };
}

function explicitSourceName(item: Record<string, unknown>): string {
  const explicit =
    stringValue(item.sourceName) ||
    stringValue(item.website) ||
    stringValue(item.web_anchor) ||
    stringValue(item.source) ||
    stringValue(item.platform);

  return explicit.trim();
}

function platformMappingFromHost(
  host: string,
): { canonicalSourceName: string; sourceCategory: SearchSourceType } | null {
  const normalized = host.replace(/^www\./, "").toLowerCase();
  if (normalized === "wenxue.iqiyi.com" || normalized.endsWith(".wenxue.iqiyi.com")) {
    return { canonicalSourceName: "爱奇艺文学", sourceCategory: "ebook_platform" };
  }
  if (normalized === "ac.qq.com" || normalized.endsWith(".ac.qq.com")) {
    return { canonicalSourceName: "腾讯动漫", sourceCategory: "ebook_platform" };
  }
  if (normalized === "music.163.com" || normalized.endsWith(".music.163.com")) {
    return { canonicalSourceName: "网易云音乐", sourceCategory: "audio_platform" };
  }
  const mappings: Array<[string, string, SearchSourceType]> = [
    ["jjwxc.net", "晋江文学城", "ebook_platform"],
    ["fanqienovel.com", "番茄小说", "ebook_platform"],
    ["qimao.com", "七猫小说", "ebook_platform"],
    ["qidian.com", "起点中文网", "ebook_platform"],
    ["zongheng.com", "纵横中文网", "ebook_platform"],
    ["ximalaya.com", "喜马拉雅", "audio_platform"],
    ["lrts.me", "懒人听书", "audio_platform"],
    ["tingbook.com", "听书相关平台", "audio_platform"],
    ["mgtv.com", "芒果TV", "video_platform"],
    ["hunantv.com", "芒果TV", "video_platform"],
    ["v.qq.com", "腾讯视频", "video_platform"],
    ["iqiyi.com", "爱奇艺", "video_platform"],
    ["youku.com", "优酷", "video_platform"],
    ["baike.baidu.com", "百度百科", "encyclopedia"],
    ["weibo.com", "微博", "social_media"],
    ["douyin.com", "抖音", "social_media"],
    ["xiaohongshu.com", "小红书", "social_media"],
    ["bilibili.com", "哔哩哔哩", "social_media"],
    ["douban.com", "豆瓣", "social_media"],
    ["baidu.com", "百度", "search_engine"],
  ];
  const matched = mappings.find(([domain]) => normalized === domain || normalized.endsWith(`.${domain}`));

  return matched ? { canonicalSourceName: matched[1], sourceCategory: matched[2] } : null;
}

function inferSourceCategoryFromRawSource(value: string): SearchSourceType {
  if (/晋江|起点|番茄|七猫|纵横|小说|文学/.test(value)) return "ebook_platform";
  if (/喜马拉雅|懒人|听书|有声/.test(value)) return "audio_platform";
  if (/芒果|腾讯视频|爱奇艺|优酷|电视剧|网剧/.test(value)) return "video_platform";
  if (/微博|抖音|小红书|哔哩|B站|豆瓣/.test(value)) return "social_media";
  if (/百科/.test(value)) return "encyclopedia";
  if (/新闻|资讯/.test(value)) return "news";
  if (/百度|搜索/.test(value)) return "search_engine";
  return "unknown";
}

function safeHost(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

function summarizeFilterReasons(reasons: string[]): string[] {
  const counts = new Map<string, number>();

  for (const reason of reasons) {
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([reason, count]) => `${reason}：${count}`);
}

function extractIpEvidence(input: {
  title: string;
  snippet: string;
  sourceName: string;
  sourceCategory: SearchSourceType;
  url: string;
}): IpEvidence[] {
  const text = `${input.title} ${input.snippet} ${input.sourceName} ${input.url}`;
  const keywords = ["影视化", "影视改编", "改编为", "影视原著", "原著小说", "电视剧", "网剧", "剧版", "动画化", "漫画改编", "广播剧", "出版", "上线", "播出", "主演", "官宣"];
  const hits = keywords.filter((keyword) => text.includes(keyword));

  if (!hits.length) {
    return [];
  }

  const confidence: SearchEvidenceStrength = hits.length >= 2 ? "high" : "medium";
  const evidenceText = `摘要中出现“${hits.slice(0, 4).join(" / ")}”，仅作为待核验初步信号`;

  return [
    {
      type: "adapted_drama",
      sourceName: input.sourceName,
      sourceCategory: input.sourceCategory,
      evidenceText,
      confidence,
    },
  ];
}

function extractHeatEvidence(input: {
  title: string;
  snippet: string;
  sourceName: string;
  sourceCategory: SearchSourceType;
  url: string;
}): HeatEvidence[] {
  const text = `${input.title} ${input.snippet} ${input.sourceName} ${input.url}`;
  const keywords = ["热搜", "话题阅读", "讨论量", "播放量", "评分", "排名", "榜单", "点赞", "转发", "收藏", "粉丝", "订阅"];
  const hits = keywords.filter((keyword) => text.includes(keyword));
  if (!hits.length) {
    return [];
  }

  const strength: SearchEvidenceStrength =
    input.sourceCategory === "social_media" || hits.length >= 3 ? "high" : hits.length >= 1 ? "medium" : "low";
  const evidenceText = `摘要中出现“${hits.slice(0, 4).join(" / ")}”，仅作为待核验初步信号`;

  return [
    {
      sourceName: input.sourceName,
      sourceCategory: input.sourceCategory,
      evidenceText,
      strength,
    },
  ];
}

function normalizeSourceType(value: string): SearchSourceType {
  if (value === "web" || value === "search") {
    return "search_engine";
  }
  if (
    value === "audio_platform" ||
    value === "ebook_platform" ||
    value === "video_platform" ||
    value === "search_engine" ||
    value === "social_media" ||
    value === "encyclopedia" ||
    value === "news"
  ) {
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

function parseNonNegativeInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed >= 0 ? Math.trunc(parsed) : fallback;
}

function getRetryAfterMs(value: string | null, fallback: number): number {
  const seconds = Number(value);

  return Number.isFinite(seconds) && seconds > 0 ? Math.max(Math.trunc(seconds * 1_000), fallback) : fallback;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function sanitizeSearchError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  return message.replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, "Bearer <redacted>");
}
