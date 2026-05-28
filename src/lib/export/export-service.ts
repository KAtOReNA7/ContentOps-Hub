import type { Prisma } from "@prisma/client";
import type { FinalMatch } from "@/lib/adapters/search-adapter";
import type { CoverPromptSuggestion, IntroVariantSuggestion, TitleVariantSuggestion } from "@/lib/generation/title-intro-types";
import type { ExportWorkFilters, ExportWorkRow, ExportWorkbookPayload } from "@/lib/export/export-types";
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

export const workExportInclude = {
  coverAssets: { orderBy: { createdAt: "desc" }, take: 3 },
  coverEvaluations: { orderBy: { createdAt: "desc" }, take: 1 },
  coverRenders: { orderBy: { createdAt: "desc" }, take: 16 },
  identifications: { orderBy: { updatedAt: "desc" }, take: 1 },
  ratings: { orderBy: { createdAt: "desc" }, take: 1 },
  titleIntroGenerations: { orderBy: { createdAt: "desc" }, take: 1 },
} satisfies Prisma.WorkInclude;

export type WorkForExport = Prisma.WorkGetPayload<{ include: typeof workExportInclude }>;

const reviewStatusLabels: Record<string, string> = {
  approved: "已采用",
  needs_revision: "需修改",
  on_hold: "暂缓",
  pending_review: "待审核",
  rejected: "已退回",
};

const finalCoverSourceLabels: Record<string, string> = {
  chatgpt_image2: "ChatGPT Image2 重绘",
  local_sharp: "原图换标题",
  original_cover: "原封面",
};

const coverStrategyLabels: Record<string, string> = {
  keep_and_optimize_layout: "保留主体，优化标题区和版式",
  keep_and_replace_title: "保留主体，仅替换封面标题",
  redraw_cover: "重新绘制封面",
};

export async function buildAllWorksExport(filters: ExportWorkFilters = {}): Promise<ExportWorkbookPayload> {
  const works = await findWorksForExport(filters);

  return {
    fileName: `works-export-${fileDate()}.xlsx`,
    rows: works.map((work) => toExportRow(work)),
  };
}

export async function buildSingleWorkExport(workId: string): Promise<ExportWorkbookPayload | null> {
  const work = await prisma.work.findUnique({
    include: workExportInclude,
    where: { id: workId },
  });

  if (!work) {
    return null;
  }

  return {
    fileName: `work-export-${safeFilePart(work.externalId || work.id)}-${fileDate()}.xlsx`,
    rows: [toExportRow(work)],
  };
}

export async function findWorksForExport(filters: ExportWorkFilters = {}): Promise<WorkForExport[]> {
  const where = buildWorkWhere(filters);

  return prisma.work.findMany({
    include: workExportInclude,
    orderBy: { createdAt: "desc" },
    where,
  });
}

export function buildWorkWhere(filters: ExportWorkFilters): Prisma.WorkWhereInput {
  const and: Prisma.WorkWhereInput[] = [];

  if (filters.ids?.length) {
    and.push({ id: { in: filters.ids } });
  }
  if (filters.title?.trim()) {
    and.push({ title: { contains: filters.title.trim() } });
  }
  if (filters.externalId?.trim()) {
    and.push({ externalId: { contains: filters.externalId.trim() } });
  }
  if (filters.author?.trim()) {
    and.push({ author: { contains: filters.author.trim() } });
  }
  if (filters.category?.trim()) {
    and.push({ category: filters.category.trim() });
  }
  if (filters.reviewStatus?.trim()) {
    and.push({ reviewStatus: filters.reviewStatus.trim() });
  }
  if (filters.rating?.trim()) {
    and.push({ ratings: { some: { rating: filters.rating.trim() } } });
  }

  return and.length ? { AND: and } : {};
}

export function toExportRow(work: WorkForExport): ExportWorkRow {
  const identification = work.identifications[0] ?? null;
  const rating = work.ratings[0] ?? null;
  const generation = work.titleIntroGenerations[0] ?? null;
  const coverAsset = work.coverAssets[0] ?? null;
  const coverEvaluation = work.coverEvaluations[0] ?? null;
  const localSharpRenders = work.coverRenders.filter((render) => render.strategy !== "redraw_cover");
  const redrawRenders = work.coverRenders.filter((render) => render.strategy === "redraw_cover");
  const latestSquareRender = localSharpRenders.find((render) => render.outputRatio === "1:1") ?? null;
  const latestPortraitRender = localSharpRenders.find((render) => render.outputRatio === "3:4") ?? null;
  const latestRedrawSquare = redrawRenders.find((render) => render.outputRatio === "1:1") ?? null;
  const latestRedrawPortrait = redrawRenders.find((render) => render.outputRatio === "3:4") ?? null;
  const finalMatch = safeJsonParse<FinalMatch | null>(identification?.finalMatchJson, null);
  const identificationRisks = safeJsonParse<string[]>(identification?.risksJson, []);
  const ratingReasons = safeJsonParse<string[]>(rating?.reasonsJson, []);
  const ratingRisks = safeJsonParse<string[]>(rating?.risksJson, []);
  const ratingEvidence = safeJsonParse<string[]>(rating?.evidenceJson, []);
  const titleVariants = safeJsonParse<TitleVariantSuggestion[]>(generation?.titleVariantsJson, []);
  const introVariant = safeJsonParse<IntroVariantSuggestion | null>(generation?.introVariantJson, null);
  const coverPrompts = safeJsonParse<CoverPromptSuggestion[]>(generation?.coverPromptsJson, []);
  const generationEvidence = safeJsonParse<string[]>(generation?.evidenceJson, []);
  const coverStrengths = safeJsonParse<string[]>(coverEvaluation?.strengthsJson, []);
  const coverWeaknesses = safeJsonParse<string[]>(coverEvaluation?.weaknessesJson, []);
  const provider = inferGenerationProvider(generationEvidence);
  const exportedAt = exportDateFormatter.format(new Date());
  const finalTitle = text(work.finalTitle) || work.title;
  const finalIntro = text(work.finalIntro) || text(introVariant?.intro) || work.description;
  const finalCoverUrl = text(work.finalCoverUrl);

  return {
    "作品 ID": text(work.externalId),
    "原书名 title": work.title,
    "作者 author": text(work.author),
    "品类 category": text(work.category),
    "当前简介 description": work.description,
    "当前播放量 currentPlays": work.currentPlays ?? "",
    "当前点击率 currentCtr": percent(work.currentCtr),
    "当前完播率 currentFinish": percent(work.currentFinish),
    "封面文件名 coverFileName": text(work.coverFileName),
    "封面地址 remoteUrl": text(coverAsset?.remoteUrl ?? work.coverUrl),
    "审核状态": reviewStatusLabels[work.reviewStatus] ?? work.reviewStatus,
    "最终书名": finalTitle,
    "最终简介": finalIntro,
    "最终封面地址": finalCoverUrl,
    "最终封面来源": work.finalCoverSource ? finalCoverSourceLabels[work.finalCoverSource] ?? work.finalCoverSource : "",
    "审核备注": text(work.reviewNote),
    "审核人": text(work.reviewerName),
    "审核时间": work.reviewedAt ? exportDateFormatter.format(work.reviewedAt) : "",
    "识别匹配作品名": text(finalMatch?.title),
    "识别匹配作者": text(finalMatch?.author),
    "识别置信度": decimal(identification?.confidence),
    "识别理由": text(identification?.reason),
    "识别风险": joinList(identificationRisks),
    "识别是否人工确认": booleanLabel(identification?.confirmed),
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
    "新版简介": text(introVariant?.intro),
    "简介优化理由": text(introVariant?.reason),
    "封面Prompt": coverPromptsToText(coverPrompts),
    "封面评分 score": coverEvaluation?.score ?? "",
    "封面评级 rating": text(coverEvaluation?.rating),
    "封面优点 strengths": joinList(coverStrengths),
    "封面问题 weaknesses": joinList(coverWeaknesses),
    "封面处理策略 strategy": coverStrategyLabels[coverEvaluation?.strategy ?? ""] ?? text(coverEvaluation?.strategy),
    "封面处理理由 reason": text(coverEvaluation?.reason),
    "封面是否人工确认 confirmed": booleanLabel(coverEvaluation?.confirmed),
    "封面人工确认策略 confirmedStrategy": coverStrategyLabels[coverEvaluation?.confirmedStrategy ?? ""] ?? text(coverEvaluation?.confirmedStrategy),
    "封面人工备注 note": text(coverEvaluation?.reviewNote),
    "原图换标题1:1地址": latestSquareRender ? `/api/cover-renders/${latestSquareRender.id}/file` : "",
    "原图换标题3:4地址": latestPortraitRender ? `/api/cover-renders/${latestPortraitRender.id}/file` : "",
    "Image2重绘 provider": text(latestRedrawSquare?.provider ?? latestRedrawPortrait?.provider),
    "Image2重绘状态": redrawStatusSummary(latestRedrawSquare, latestRedrawPortrait),
    "Image2重绘 prompt": text(latestRedrawSquare?.prompt ?? latestRedrawPortrait?.prompt),
    "Image2重绘结果摘要": redrawResultSummary(latestRedrawSquare, latestRedrawPortrait),
    "Image2重绘1:1是否生成": booleanLabel(latestRedrawSquare?.status === "success"),
    "Image2重绘3:4是否生成": booleanLabel(latestRedrawPortrait?.status === "success"),
    "Image2重绘1:1地址": latestRedrawSquare?.status === "success" ? `/api/cover-renders/${latestRedrawSquare.id}/file` : "",
    "Image2重绘3:4地址": latestRedrawPortrait?.status === "success" ? `/api/cover-renders/${latestRedrawPortrait.id}/file` : "",
    "导出时间 exportedAt": exportedAt,
  };
}

function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function joinList(value: string[]): string {
  return value.filter(Boolean).join("；");
}

function titleAt(value: TitleVariantSuggestion[], index: number, key: "title" | "reason"): string {
  return text(value[index]?.[key]);
}

function coverPromptsToText(value: CoverPromptSuggestion[]): string {
  return joinList(value.map((prompt) => `${prompt.ratio}：${prompt.prompt}`));
}

function inferGenerationProvider(evidence: string[]): string {
  const textValue = joinList(evidence);
  if (textValue.includes("OpenAI")) return "openai";
  if (textValue.includes("Mock")) return "mock";
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

function redrawStatusSummary(
  square: { status: string; errorMessage: string | null } | null,
  portrait: { status: string; errorMessage: string | null } | null,
): string {
  return joinList([
    square ? `1:1 ${square.status}${square.errorMessage ? `：${square.errorMessage}` : ""}` : "",
    portrait ? `3:4 ${portrait.status}${portrait.errorMessage ? `：${portrait.errorMessage}` : ""}` : "",
  ]);
}

function redrawResultSummary(
  square: { status: string; titleText: string } | null,
  portrait: { status: string; titleText: string } | null,
): string {
  return joinList([
    square ? `1:1 ${square.status} ${square.titleText}` : "",
    portrait ? `3:4 ${portrait.status} ${portrait.titleText}` : "",
  ]);
}

function fileDate(): string {
  return fileDateFormatter.format(new Date()).replace(/\//g, "");
}

function safeFilePart(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, "_").slice(0, 80) || "work";
}
