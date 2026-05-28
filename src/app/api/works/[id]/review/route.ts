import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const reviewStatuses = ["pending_review", "approved", "rejected", "on_hold", "needs_revision"] as const;
type ReviewStatus = (typeof reviewStatuses)[number];

type TitleVariant = {
  title?: string;
};

type IntroVariant = {
  intro?: string;
};

type ReviewRequestBody = {
  reviewStatus?: string;
  finalTitle?: string | null;
  finalIntro?: string | null;
  finalCoverUrl?: string | null;
  finalCoverAssetId?: string | null;
  finalCoverRenderId?: string | null;
  finalCoverSource?: string | null;
  reviewNote?: string | null;
  reviewerName?: string | null;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const work = await prisma.work.findUnique({
    where: { id },
    include: {
      coverAssets: {
        orderBy: { createdAt: "desc" },
        take: 6,
      },
      coverRenders: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      titleIntroGenerations: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!work) {
    return NextResponse.json(
      {
        success: false,
        message: "作品不存在",
        errors: ["WORK_NOT_FOUND"],
      },
      { status: 404 },
    );
  }

  const generation = work.titleIntroGenerations[0] ?? null;
  const titleVariants = safeJsonParse<TitleVariant[]>(generation?.titleVariantsJson, []);
  const introVariant = safeJsonParse<IntroVariant | null>(generation?.introVariantJson, null);
  const coverOptions = [
    ...work.coverAssets.map((asset) => ({
      label: asset.sourceType === "remote_url" ? "原封面（远程地址）" : "原封面（本地上传）",
      source: "original_cover",
      coverAssetId: asset.id,
      coverRenderId: null,
      url: `/api/cover-assets/${asset.id}/file`,
    })),
    ...work.coverRenders
      .filter((render) => render.status === "success")
      .map((render) => ({
        label: `${render.provider === "chatgpt_image2" ? "ChatGPT Image2 重绘" : "原图换标题"} ${render.outputRatio}`,
        source: render.provider === "chatgpt_image2" ? "chatgpt_image2" : "local_sharp",
        coverAssetId: null,
        coverRenderId: render.id,
        url: `/api/cover-renders/${render.id}/file`,
      })),
  ];

  return NextResponse.json({
    success: true,
    data: {
      review: {
        reviewStatus: work.reviewStatus,
        finalTitle: work.finalTitle,
        finalIntro: work.finalIntro,
        finalCoverUrl: work.finalCoverUrl,
        finalCoverAssetId: work.finalCoverAssetId,
        finalCoverRenderId: work.finalCoverRenderId,
        finalCoverSource: work.finalCoverSource,
        reviewNote: work.reviewNote,
        reviewedAt: work.reviewedAt?.toISOString() ?? null,
        reviewerName: work.reviewerName,
      },
      suggestions: {
        titles: [
          { label: work.title, value: work.title },
          ...titleVariants
            .map((variant, index) => ({
              label: variant.title?.trim() || `新书名 ${index + 1}`,
              value: variant.title?.trim() ?? "",
            }))
            .filter((option) => option.value),
        ],
        intros: [
          { label: "当前简介", value: work.description },
          introVariant?.intro ? { label: "新版简介", value: introVariant.intro } : null,
        ].filter(Boolean),
        covers: coverOptions,
      },
    },
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as ReviewRequestBody | null;

  if (!body) {
    return NextResponse.json(
      {
        success: false,
        message: "请求体必须是 JSON",
        errors: ["INVALID_JSON"],
      },
      { status: 400 },
    );
  }

  const reviewStatus = normalizeReviewStatus(body.reviewStatus);

  if (!reviewStatus) {
    return NextResponse.json(
      {
        success: false,
        message: "审核状态无效",
        errors: [`reviewStatus 仅支持：${reviewStatuses.join(", ")}`],
      },
      { status: 400 },
    );
  }

  const work = await prisma.work.findUnique({ where: { id }, select: { id: true } });

  if (!work) {
    return NextResponse.json(
      {
        success: false,
        message: "作品不存在",
        errors: ["WORK_NOT_FOUND"],
      },
      { status: 404 },
    );
  }

  const updated = await prisma.work.update({
    where: { id },
    data: {
      reviewStatus,
      finalTitle: emptyToNull(body.finalTitle),
      finalIntro: emptyToNull(body.finalIntro),
      finalCoverUrl: emptyToNull(body.finalCoverUrl),
      finalCoverAssetId: emptyToNull(body.finalCoverAssetId),
      finalCoverRenderId: emptyToNull(body.finalCoverRenderId),
      finalCoverSource: emptyToNull(body.finalCoverSource),
      reviewNote: emptyToNull(body.reviewNote),
      reviewerName: emptyToNull(body.reviewerName),
      reviewedAt: new Date(),
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      reviewStatus: updated.reviewStatus,
      finalTitle: updated.finalTitle,
      finalIntro: updated.finalIntro,
      finalCoverUrl: updated.finalCoverUrl,
      finalCoverAssetId: updated.finalCoverAssetId,
      finalCoverRenderId: updated.finalCoverRenderId,
      finalCoverSource: updated.finalCoverSource,
      reviewNote: updated.reviewNote,
      reviewedAt: updated.reviewedAt?.toISOString() ?? null,
      reviewerName: updated.reviewerName,
    },
  });
}

function normalizeReviewStatus(value: string | undefined): ReviewStatus | null {
  if (!value) {
    return "pending_review";
  }

  return reviewStatuses.includes(value as ReviewStatus) ? (value as ReviewStatus) : null;
}

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}

function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
