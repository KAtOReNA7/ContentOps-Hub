export type SearchWorkInput = {
  title: string;
  author: string | null;
  intro: string;
  category: string | null;
  coverFileName: string | null;
  remark: string | null;
};

type LegacySearchWorkInput = {
  title: string;
  author: string | null;
  description: string;
  category: string | null;
  coverFileName: string | null;
  notes?: string | null;
};

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

export type WorkIdentificationResult = {
  candidates: CandidateWork[];
  finalMatch: FinalMatch | null;
  confidence: number;
  reason: string;
  risks: string[];
  final: LegacyFinalMatch;
};

export interface SearchAdapter {
  identifyWork(work: SearchWorkInput | LegacySearchWorkInput): Promise<WorkIdentificationResult>;
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

export function identifyWorkWithMock(input: SearchWorkInput | LegacySearchWorkInput): WorkIdentificationResult {
  const work = normalizeInput(input);
  const candidates = buildMockCandidates(work)
    .map((candidate) => scoreCandidate(work, candidate))
    .sort((left, right) => right.score - left.score);
  const best = candidates[0] ?? null;
  const finalMatch = best ? { title: best.title, author: best.author } : null;
  const confidence = best?.score ?? 0;
  const reason = best
    ? `最高分候选：${best.matchReasons.join("；")}`
    : "未生成候选作品。";
  const risks = buildRisks(best);

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
  };
}

function buildMockCandidates(work: SearchWorkInput): Array<Omit<CandidateWork, "score" | "matchReasons" | "excludeReasons" | "possibleDuplicate" | "matchReason" | "excludeReason" | "suspectedSameName">> {
  const author = work.author || "未知作者";
  const category = work.category || "通用品类";
  const keyword = extractKeywords(work.intro)[0] || category;

  return [
    {
      title: work.title,
      candidateTitle: work.title,
      author,
      platform: "番茄畅听",
      sourcePlatform: "番茄畅听",
      summary: `${category}作品，简介关键词：${keyword}。`,
    },
    {
      title: `${work.title} 完整版`,
      candidateTitle: `${work.title} 完整版`,
      author,
      platform: "喜马拉雅",
      sourcePlatform: "喜马拉雅",
      summary: `疑似同作品延展版本，包含${keyword}、反转、成长等元素。`,
    },
    {
      title: work.title.replace("后", "之后") || `${work.title}同名作品`,
      candidateTitle: work.title.replace("后", "之后") || `${work.title}同名作品`,
      author: `${author}工作室`,
      platform: "懒人听书",
      sourcePlatform: "懒人听书",
      summary: `标题接近，品类接近${category}，但作者信息存在差异。`,
    },
    {
      title: `${work.title.slice(0, Math.max(2, Math.floor(work.title.length / 2)))}往事`,
      candidateTitle: `${work.title.slice(0, Math.max(2, Math.floor(work.title.length / 2)))}往事`,
      author: "平台聚合作者",
      platform: "七猫免费小说",
      sourcePlatform: "七猫免费小说",
      summary: "标题局部相似，简介和作者均需要人工复核。",
    },
  ];
}

function scoreCandidate(
  work: SearchWorkInput,
  candidate: Omit<CandidateWork, "score" | "matchReasons" | "excludeReasons" | "possibleDuplicate" | "matchReason" | "excludeReason" | "suspectedSameName">,
): CandidateWork {
  const titleScore = similarity(work.title, candidate.title);
  const authorMatches = Boolean(work.author && normalizeText(work.author) === normalizeText(candidate.author));
  const keywordScore = keywordOverlap(work.intro, candidate.summary);
  const categoryMatches = Boolean(work.category && candidate.summary.includes(work.category));
  const possibleDuplicate = titleScore > 0.78 && !authorMatches;
  const score = clampScore(
    Math.round(
      titleScore * 45 +
        (authorMatches ? 25 : 0) +
        keywordScore * 20 +
        (categoryMatches ? 10 : 0) -
        (possibleDuplicate ? 12 : 0),
    ),
  );
  const matchReasons = [
    `书名相似度 ${Math.round(titleScore * 100)}%`,
    authorMatches ? "作者一致" : "作者不一致",
    `简介关键词重合 ${Math.round(keywordScore * 100)}%`,
    categoryMatches ? "品类一致" : "品类未确认",
  ];
  const excludeReasons = [
    !authorMatches ? "作者信息不同" : "",
    possibleDuplicate ? "疑似重名" : "",
    keywordScore < 0.2 ? "简介关键词重合较低" : "",
  ].filter(Boolean);

  return {
    ...candidate,
    score,
    matchReasons,
    excludeReasons,
    possibleDuplicate,
    matchReason: matchReasons.join("；"),
    excludeReason: excludeReasons.length ? excludeReasons.join("；") : "暂无明显排除理由",
    suspectedSameName: possibleDuplicate,
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
