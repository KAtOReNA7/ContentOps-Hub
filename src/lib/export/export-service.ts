import type { Prisma } from "@prisma/client";
import type { FinalMatch } from "@/lib/adapters/search-adapter";
import type { CoverPromptSuggestion, IntroVariantSuggestion, TitleVariantSuggestion } from "@/lib/generation/title-intro-types";
import type { ExportWorkRow, ExportWorkbookPayload } from "@/lib/export/export-types";
import { prisma } from "@/server/db";

const exportDateFormatter = new Intl.DateTimeFormat("zh-CN", {
  dateStyle: "short",
  timeStyle: "medium",
  timeZone: "Asia/Shanghai",
});

const fileDateFormatter = new Intl.DateTimeFormat("zh-CN", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "Asia/Shanghai",
  year: "numeric",
});

const workInclude = {
  coverAssets: {
    orderBy: { createdAt: "desc" },
    take: 1,
  },
  coverEvaluations: {
    orderBy: { createdAt: "desc" },
    take: 1,
  },
  coverRenders: {
    orderBy: { createdAt: "desc" },
    take: 8,
  },
  identifications: {
    orderBy: { updatedAt: "desc" },
    take: 1,
  },
  ratings: {
    orderBy: { createdAt: "desc" },
    take: 1,
  },
  titleIntroGenerations: {
    orderBy: { createdAt: "desc" },
    take: 1,
  },
} satisfies Prisma.WorkInclude;

type WorkForExport = Prisma.WorkGetPayload<{ include: typeof workInclude }>;

export async function buildAllWorksExport(): Promise<ExportWorkbookPayload> {
  const works = await prisma.work.findMany({
    include: workInclude,
    orderBy: { createdAt: "desc" },
  });

  return {
    rows: works.map((work) => toExportRow(work)),
    fileName: `works-export-${fileDate()}.xlsx`,
  };
}

export async function buildSingleWorkExport(workId: string): Promise<ExportWorkbookPayload | null> {
  const work = await prisma.work.findUnique({
    where: { id: workId },
    include: workInclude,
  });

  if (!work) {
    return null;
  }

  return {
    rows: [toExportRow(work)],
    fileName: `work-export-${safeFilePart(work.externalId || work.id)}-${fileDate()}.xlsx`,
  };
}

function toExportRow(work: WorkForExport): ExportWorkRow {
  const identification = work.identifications[0] ?? null;
  const rating = work.ratings[0] ?? null;
  const generation = work.titleIntroGenerations[0] ?? null;
  const coverAsset = work.coverAssets[0] ?? null;
  const coverEvaluation = work.coverEvaluations[0] ?? null;
  const latestSquareRender = work.coverRenders.find((render) => render.outputRatio === "1:1") ?? null;
  const latestPortraitRender = work.coverRenders.find((render) => render.outputRatio === "3:4") ?? null;
  const finalMatchRaw = safeJsonParse<FinalMatch | string | null>(identification?.finalMatchJson, null);
  const finalMatch = typeof finalMatchRaw === "string" ? null : finalMatchRaw;
  const finalMatchParseError = typeof finalMatchRaw === "string" ? finalMatchRaw : "";
  const identificationRisks = safeJsonParse<string[]>(identification?.risksJson, []);
  const ratingReasons = safeJsonParse<string[]>(rating?.reasonsJson, []);
  const ratingRisks = safeJsonParse<string[]>(rating?.risksJson, []);
  const ratingEvidence = safeJsonParse<string[]>(rating?.evidenceJson, []);
  const titleVariants = safeJsonParse<TitleVariantSuggestion[] | string>(generation?.titleVariantsJson, []);
  const introVariantRaw = safeJsonParse<IntroVariantSuggestion | string | null>(generation?.introVariantJson, null);
  const introVariant = typeof introVariantRaw === "string" ? null : introVariantRaw;
  const introVariantParseError = typeof introVariantRaw === "string" ? introVariantRaw : "";
  const coverPrompts = safeJsonParse<CoverPromptSuggestion[] | string>(generation?.coverPromptsJson, []);
  const generationEvidence = safeJsonParse<string[]>(generation?.evidenceJson, []);
  const coverStrengths = safeJsonParse<string[]>(coverEvaluation?.strengthsJson, []);
  const coverWeaknesses = safeJsonParse<string[]>(coverEvaluation?.weaknessesJson, []);
  const provider = inferGenerationProvider(generationEvidence);
  const exportedAt = exportDateFormatter.format(new Date());

  return {
    "作品ID externalId": text(work.externalId),
    "原书名 title": work.title,
    "作者 author": text(work.author),
    "品类 category": text(work.category),
    "当前简介 description": work.description,
    "当前播放量 currentPlays": work.currentPlays ?? "",
    "当前点击率 currentCtr": percent(work.currentCtr),
    "当前完播率 currentFinish": percent(work.currentFinish),
    "封面文件名 coverFileName": text(work.coverFileName),
    "封面地址 remoteUrl": text(coverAsset?.remoteUrl ?? work.coverUrl),
    "识别匹配作品名": finalMatchParseError || text(finalMatch?.title),
    "识别匹配作者": finalMatchParseError || text(finalMatch?.author),
    "识别置信度": decimal(identification?.confidence),
    "识别理由": text(identification?.reason),
    "识别风险": joinList(identificationRisks),
    "是否人工确认": booleanLabel(identification?.confirmed),
    "人工确认书名": text(identification?.confirmedTitle),
    "人工确认作者": text(identification?.confirmedAuthor),
    "作品评级 rating": text(rating?.rating),
    "评级分数 score": rating?.score ?? "",
    "评级置信度 confidence": decimal(rating?.confidence),
    "评级理由 reasons": joinList(ratingReasons),
    "风险点 risks": joinList(ratingRisks),
    "证据 evidence": joinList(ratingEvidence),
    "是否建议多书名运营 renameSuggestion": text(rating?.renameSuggestion),
    "多书名建议理由 renameReason": text(rating?.renameReason),
    "生成 provider": provider,
    "生成策略 strategy": text(generation?.strategy),
    "策略说明 strategyReason": text(generation?.strategyReason),
    "是否建议多书名方案": booleanLabel(generation?.shouldGenerateVariants),
    "新书名1": titleAt(titleVariants, 0, "title"),
    "新书名1理由": titleAt(titleVariants, 0, "reason"),
    "新书名2": titleAt(titleVariants, 1, "title"),
    "新书名2理由": titleAt(titleVariants, 1, "reason"),
    "新书名3": titleAt(titleVariants, 2, "title"),
    "新书名3理由": titleAt(titleVariants, 2, "reason"),
    "新书名4": titleAt(titleVariants, 3, "title"),
    "新书名4理由": titleAt(titleVariants, 3, "reason"),
    "新书名5": titleAt(titleVariants, 4, "title"),
    "新书名5理由": titleAt(titleVariants, 4, "reason"),
    "新版简介": introVariantParseError || text(introVariant?.intro),
    "简介优化理由": introVariantParseError || text(introVariant?.reason),
    "封面Prompt": coverPromptsToText(coverPrompts),
    "封面评分 score": coverEvaluation?.score ?? "",
    "封面评级 rating": text(coverEvaluation?.rating),
    "封面优点 strengths": joinList(coverStrengths),
    "封面问题 weaknesses": joinList(coverWeaknesses),
    "封面处理策略 strategy": text(coverEvaluation?.strategy),
    "封面处理理由 reason": text(coverEvaluation?.reason),
    "封面是否人工确认 confirmed": booleanLabel(coverEvaluation?.confirmed),
    "封面人工确认策略 confirmedStrategy": text(coverEvaluation?.confirmedStrategy),
    "封面人工备注 note": text(coverEvaluation?.reviewNote),
    "新版封面1:1地址": latestSquareRender ? `/api/cover-renders/${latestSquareRender.id}/file` : "",
    "新版封面3:4地址": latestPortraitRender ? `/api/cover-renders/${latestPortraitRender.id}/file` : "",
    "导出时间 exportedAt": exportedAt,
  };
}

function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return "解析失败" as T;
  }
}

function joinList(value: string[] | string): string {
  if (typeof value === "string") {
    return value;
  }

  return value.filter(Boolean).join("；");
}

function titleAt(value: TitleVariantSuggestion[] | string, index: number, key: "title" | "reason"): string {
  if (typeof value === "string") {
    return value;
  }

  return text(value[index]?.[key]);
}

function coverPromptsToText(value: CoverPromptSuggestion[] | string): string {
  if (typeof value === "string") {
    return value;
  }

  return joinList(value.map((prompt) => `${prompt.ratio}：${prompt.prompt}`));
}

function inferGenerationProvider(evidence: string[] | string): string {
  const textValue = joinList(evidence);

  if (textValue.includes("OpenAI")) {
    return "openai";
  }

  if (textValue.includes("Mock")) {
    return "mock";
  }

  return "";
}

function text(value: string | null | undefined): string {
  return value ?? "";
}

function decimal(value: number | null | undefined): string {
  return typeof value === "number" ? String(Math.round(value * 1000) / 1000) : "";
}

function percent(value: number | null | undefined): string {
  return typeof value === "number" ? `${Math.round(value * 10000) / 100}%` : "";
}

function booleanLabel(value: boolean | null | undefined): string {
  if (value === true) return "是";
  if (value === false) return "否";
  return "";
}

function fileDate(): string {
  return fileDateFormatter.format(new Date()).replace(/\//g, "");
}

function safeFilePart(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, "_").slice(0, 80) || "work";
}
