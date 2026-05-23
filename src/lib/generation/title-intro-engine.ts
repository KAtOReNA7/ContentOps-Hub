import type {
  CoverPromptSuggestion,
  GenerationStrategy,
  IntroVariantSuggestion,
  TitleIntroGenerationInput,
  TitleIntroGenerationResult,
  TitleVariantSuggestion,
} from "@/lib/generation/title-intro-types";
import type { RenameSuggestion } from "@/lib/rating/rating-types";

const categoryProfiles = [
  { keywords: ["都市"], genre: "都市", sellingPoint: "现实压迫下的逆袭", mood: "现代都市、强对比光影", audience: "偏好都市逆袭的听众" },
  { keywords: ["赘婿"], genre: "赘婿", sellingPoint: "隐藏实力与身份反转", mood: "豪门宴会、冷暖反差", audience: "偏好打脸爽点的听众" },
  { keywords: ["战神"], genre: "战神", sellingPoint: "强者归来和守护复仇", mood: "冷峻战场、城市夜色", audience: "偏好强者归来的听众" },
  { keywords: ["神医"], genre: "神医", sellingPoint: "绝技救局和身份反转", mood: "现代诊室、金针药香", audience: "偏好神医逆袭的听众" },
  { keywords: ["悬疑"], genre: "悬疑", sellingPoint: "线索反转和真相揭开", mood: "暗色街巷、迷雾线索", audience: "偏好悬疑揭秘的听众" },
  { keywords: ["灵异"], genre: "灵异", sellingPoint: "禁忌真相和生死悬念", mood: "阴冷古宅、克制惊悚", audience: "偏好灵异悬念的听众" },
  { keywords: ["玄幻"], genre: "玄幻", sellingPoint: "天赋觉醒和强者成长", mood: "恢弘山河、灵光法阵", audience: "偏好升级成长的听众" },
  { keywords: ["修仙"], genre: "修仙", sellingPoint: "逆天改命和境界突破", mood: "仙山云海、东方玄奇", audience: "偏好修仙升级的听众" },
  { keywords: ["重生"], genre: "重生", sellingPoint: "重生改命和弥补遗憾", mood: "命运回溯、冷暖交替", audience: "偏好重生改命的听众" },
  { keywords: ["穿越"], genre: "穿越", sellingPoint: "异世破局和知识差", mood: "古今碰撞、命运新局", audience: "偏好穿越破局的听众" },
  { keywords: ["年代"], genre: "年代", sellingPoint: "时代变局中的翻身", mood: "年代街景、温暖写实", audience: "偏好年代成长的听众" },
  { keywords: ["种田"], genre: "种田", sellingPoint: "从低谷到富足经营", mood: "乡野烟火、明亮生活感", audience: "偏好经营治愈的听众" },
  { keywords: ["言情"], genre: "言情", sellingPoint: "情感拉扯和关系反转", mood: "情绪化人物特写", audience: "偏好情感纠葛的听众" },
  { keywords: ["霸总"], genre: "霸总", sellingPoint: "强关系和情感博弈", mood: "高端都市、冷调奢华", audience: "偏好霸总情感线的听众" },
  { keywords: ["宫斗"], genre: "宫斗", sellingPoint: "权谋博弈和步步翻盘", mood: "宫墙深影、华丽压迫", audience: "偏好权谋反转的听众" },
  { keywords: ["末世"], genre: "末世", sellingPoint: "生存压力和秩序重建", mood: "废土城市、危机氛围", audience: "偏好末世生存的听众" },
  { keywords: ["规则怪谈"], genre: "规则怪谈", sellingPoint: "规则陷阱和禁忌真相", mood: "异常空间、冷色警示", audience: "偏好规则悬疑的听众" },
];

const suspenseWords = ["真相", "秘密", "阴谋", "谜案", "禁忌", "线索", "失踪", "规则"];
const reversalWords = ["重生", "归来", "翻身", "逆袭", "打脸", "复仇", "隐藏", "改命"];
const conflictWords = ["背叛", "误解", "夺回", "陷害", "离婚", "退婚", "争夺", "危机"];

export function generateTitleIntroSuggestions(input: TitleIntroGenerationInput): TitleIntroGenerationResult {
  const risks: string[] = [];
  const evidence: string[] = [];
  const workText = buildWorkText(input);
  const title = normalize(input.work.title) || "未命名作品";
  const author = normalize(input.work.author) || "主角";
  const intro = normalize(input.work.intro);
  const profile = detectCategoryProfile(workText);
  const strategy = strategyFromRenameSuggestion(input.rating?.renameSuggestion);
  const shouldGenerateVariants = strategy !== "keep_original";

  collectEvidence(input, profile, evidence, risks);

  const titleVariants = shouldGenerateVariants
    ? buildTitleVariants(title, author, profile, strategy, workText)
    : buildKeepOriginalTitle(title, profile);

  return {
    shouldGenerateVariants,
    strategy,
    strategyReason: strategyReason(input.rating?.renameSuggestion, input.rating?.renameReason),
    titleVariants,
    introVariant: buildIntroVariant(input, title, author, profile, strategy, intro),
    coverPrompts: buildCoverPrompts(title, profile, strategy),
    risks: Array.from(new Set(risks)),
    evidence: Array.from(new Set(evidence)),
  };
}

function strategyFromRenameSuggestion(suggestion: RenameSuggestion | null | undefined): GenerationStrategy {
  if (suggestion === "avoid") return "keep_original";
  if (suggestion === "cautious") return "minor_optimization";
  if (suggestion === "recommended") return "rename_test";
  if (suggestion === "strongly_recommended") return "heavy_repackage";
  return "minor_optimization";
}

function strategyReason(suggestion: RenameSuggestion | null | undefined, renameReason: string | null | undefined): string {
  if (renameReason) {
    return renameReason;
  }

  if (suggestion === "avoid") return "评级建议不改名，保留原作认知，只做轻微简介优化。";
  if (suggestion === "cautious") return "评级建议谨慎测试，优先保留原书名核心识别。";
  if (suggestion === "recommended") return "评级建议多书名测试，可强化题材、冲突和爽点。";
  if (suggestion === "strongly_recommended") return "评级建议重包装，可更明确突出核心卖点，但不能脱离作品信息。";
  return "未提供完整评级建议，按轻度优化策略处理。";
}

function buildTitleVariants(
  originalTitle: string,
  author: string,
  profile: CategoryProfile,
  strategy: GenerationStrategy,
  workText: string,
): TitleVariantSuggestion[] {
  const safeCore = trimTitleCore(originalTitle);
  const styleSeeds = selectStyleSeeds(workText);
  const variants: TitleVariantSuggestion[] = [
    {
      title: `${safeCore}：${profile.sellingPoint}`,
      sellingPoint: profile.sellingPoint,
      targetAudience: profile.audience,
      reason: "保留原书名核心，同时补充可感知的题材卖点。",
      risk: "副标题表达需要人工确认是否贴合原作设定。",
      styleTag: "轻度优化型",
    },
    {
      title: `${author}的${profile.genre}翻身局`,
      sellingPoint: "主角处境与行动目标",
      targetAudience: profile.audience,
      reason: "用主角视角强化代入感和翻身期待。",
      risk: "如果原作不是单主角强驱动，需要降低主角化表达。",
      styleTag: "身份反转型",
    },
    {
      title: `${profile.genre}局中局：${styleSeeds[0]}`,
      sellingPoint: styleSeeds[0],
      targetAudience: profile.audience,
      reason: "用悬念词制造点击钩子，适合测试标题吸引力。",
      risk: "悬念表达不能超过原简介已有信息。",
      styleTag: "悬念钩子型",
    },
    {
      title: `被低估后，我靠${profile.sellingPoint}破局`,
      sellingPoint: "被误解后打脸",
      targetAudience: "偏好逆袭和打脸节奏的听众",
      reason: "突出压迫感和破局爽点，适合中腰部作品测试。",
      risk: "第一人称标题需确认平台调性和原作叙事视角。",
      styleTag: "爽文直给型",
    },
    {
      title: `${styleSeeds[1]}那天，${profile.genre}命运改写`,
      sellingPoint: styleSeeds[1],
      targetAudience: profile.audience,
      reason: "用关键事件制造情绪张力和继续收听动机。",
      risk: "事件词需要和原简介保持一致，避免误导。",
      styleTag: "情绪压迫型",
    },
  ];

  if (strategy === "minor_optimization") {
    return variants.slice(0, 3);
  }

  return variants.slice(0, 5);
}

function buildKeepOriginalTitle(originalTitle: string, profile: CategoryProfile): TitleVariantSuggestion[] {
  return [
    {
      title: originalTitle,
      sellingPoint: profile.sellingPoint,
      targetAudience: profile.audience,
      reason: "当前策略不建议生成大量新书名，保留原书名更稳妥。",
      risk: "如后续数据表现下滑，可再小范围测试副标题。",
      styleTag: "保留原名型",
    },
  ];
}

function buildIntroVariant(
  input: TitleIntroGenerationInput,
  title: string,
  author: string,
  profile: CategoryProfile,
  strategy: GenerationStrategy,
  originalIntro: string,
): IntroVariantSuggestion {
  const matchedTitle = input.identification?.finalMatch?.title || title;
  const conflict = pickFirstKeyword(`${originalIntro} ${title}`, conflictWords) || "突如其来的危机";
  const hook = pickFirstKeyword(`${originalIntro} ${title}`, [...suspenseWords, ...reversalWords]) || profile.sellingPoint;
  const conservativePrefix = originalIntro ? "" : "原始简介信息有限，以下为保守包装方向：";
  const intro =
    `${conservativePrefix}${author}站在${profile.genre}故事的转折点上，原本平静的生活被${conflict}打破。` +
    `围绕《${matchedTitle}》的核心线索，他必须在压力、误解和选择中重新破局。` +
    `作品重点突出${profile.sellingPoint}，用${hook}带出人物行动和后续悬念，适合强化开篇吸引力与持续收听动机。`;

  return {
    intro: limitLength(intro, 180),
    reason: strategy === "keep_original" ? "保留原作认知，只对简介卖点顺序做轻微优化。" : "补足主角、处境、冲突、爽点和悬念，便于后续多书名测试。",
    styleTag: strategy === "heavy_repackage" ? "强包装简介" : "稳健卖点简介",
    risk: originalIntro ? "仍需人工确认简介是否覆盖原作关键设定。" : "原简介缺失，当前简介只能作为保守 Mock 方向。",
  };
}

function buildCoverPrompts(title: string, profile: CategoryProfile, strategy: GenerationStrategy): CoverPromptSuggestion[] {
  const intensity = strategy === "heavy_repackage" ? "强冲突、强视觉焦点" : "清晰卖点、克制戏剧感";
  const base = `主视觉围绕《${title}》，人物/场景体现${profile.sellingPoint}，氛围为${profile.mood}，色调有明确冷暖对比，字体方向偏有声书封面大字标题，避免低俗擦边、血腥猎奇、违法元素、过度夸张表情和与题材无关的场景。`;

  return [
    {
      ratio: "1:1",
      prompt: `${base} 构图适配 1:1 方形封面，中心人物突出，标题区域留在上半部，整体${intensity}。`,
      reason: "适合列表页和推荐位缩略图，优先保证标题可读性。",
      risk: "本阶段只生成 prompt，不生成图片，后续需要人工或图片 API 二次确认。",
    },
    {
      ratio: "3:4",
      prompt: `${base} 构图适配 3:4 竖版封面，人物占画面中下部，场景纵深明显，标题区域留在顶部，整体${intensity}。`,
      reason: "适合详情页和竖版投放物料，能承载更多人物与环境信息。",
      risk: "竖版构图需要避免标题压住人物面部或核心场景。",
    },
  ];
}

function collectEvidence(
  input: TitleIntroGenerationInput,
  profile: CategoryProfile,
  evidence: string[],
  risks: string[],
): void {
  evidence.push(`命中题材方向：${profile.genre}`);

  if (input.rating) {
    evidence.push(`评级结果：${input.rating.rating}，分数 ${input.rating.score}`);
    evidence.push(`多书名建议：${input.rating.renameSuggestion}`);
  } else {
    risks.push("缺少评级结果，生成策略按轻度优化处理。");
  }

  if (!normalize(input.work.title)) risks.push("原书名缺失，标题建议可信度降低。");
  if (!normalize(input.work.intro)) risks.push("原简介缺失，简介和封面 prompt 只能保守生成。");
  if (!normalize(input.work.category)) risks.push("品类缺失，题材判断依赖标题和简介。");
  if (input.identification?.risks.length) {
    risks.push(...input.identification.risks.map((risk) => `识别风险：${risk}`));
  }
  if ((input.identification?.confidence ?? 100) < 60) {
    risks.push("识别置信度偏低，生成结果需要人工复核。");
  }
}

function detectCategoryProfile(text: string): CategoryProfile {
  return categoryProfiles.find((profile) => profile.keywords.some((keyword) => text.includes(keyword))) ?? {
    keywords: [],
    genre: "通用",
    sellingPoint: "人物困境与命运转折",
    mood: "人物特写、清晰冲突、沉稳色调",
    audience: "偏好剧情反转的听众",
  };
}

function buildWorkText(input: TitleIntroGenerationInput): string {
  return [
    input.work.title,
    input.work.author,
    input.work.intro,
    input.work.category,
    input.work.remark,
    input.identification?.reason,
    input.rating?.renameReason,
    ...(input.rating?.reasons ?? []),
    ...(input.rating?.risks ?? []),
  ]
    .filter(Boolean)
    .join(" ");
}

function selectStyleSeeds(text: string): [string, string] {
  const suspense = pickFirstKeyword(text, suspenseWords) || "真相揭开";
  const reversal = pickFirstKeyword(text, reversalWords) || pickFirstKeyword(text, conflictWords) || "命运反转";
  return [suspense, reversal];
}

function pickFirstKeyword(text: string, keywords: string[]): string | null {
  return keywords.find((keyword) => text.includes(keyword)) ?? null;
}

function trimTitleCore(title: string): string {
  return title.replace(/[：:，,。.！!？?].*$/u, "").trim() || title;
}

function limitLength(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1)}…`;
}

function normalize(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

type CategoryProfile = (typeof categoryProfiles)[number];
