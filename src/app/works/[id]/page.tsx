import Link from "next/link";
import { notFound } from "next/navigation";
import { WorkCoverPanel } from "@/app/works/[id]/work-cover-panel";
import { WorkExportButton } from "@/app/works/[id]/work-export-button";
import { WorkIdentificationPanel, type WorkIdentificationView } from "@/app/works/[id]/work-identification-panel";
import { WorkRatingPanel } from "@/app/works/[id]/work-rating-panel";
import { WorkReviewPanel } from "@/app/works/[id]/work-review-panel";
import { WorkTitleIntroPanel } from "@/app/works/[id]/work-title-intro-panel";
import type { CandidateWork, FinalMatch, SearchEvidence, SearchResultItem, SourceSummary } from "@/lib/adapters/search-adapter";
import { prisma } from "@/server/db";

type WorkDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function WorkDetailPage({ params }: WorkDetailPageProps) {
  const { id } = await params;
  const work = await prisma.work.findUnique({
    where: { id },
    include: {
      identifications: {
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
    },
  });

  if (!work) {
    notFound();
  }
  const identification = work.identifications[0];
  const initialIdentification: WorkIdentificationView | null = identification
    ? {
        identificationId: identification.id,
        candidates: safeJsonParse<CandidateWork[]>(identification.candidatesJson, []),
        finalMatch: safeJsonParse<FinalMatch | null>(identification.finalMatchJson, null),
        confidence: identification.confidence,
        reason: identification.reason,
        risks: safeJsonParse<string[]>(identification.risksJson, []),
        searchProvider: identification.searchProvider,
        searchQuery: identification.searchQuery,
        searchResults: safeJsonParse<SearchResultItem[]>(identification.searchResultsJson, []),
        evidence: safeJsonParse<SearchEvidence[]>(identification.evidenceJson, []),
        riskHints: safeJsonParse<string[]>(identification.riskHintsJson, []),
        sourceSummary: safeJsonParse<SourceSummary | null>(identification.sourceSummaryJson, null),
        confirmed: identification.confirmed,
        confirmedTitle: identification.confirmedTitle,
        confirmedAuthor: identification.confirmedAuthor,
      }
    : null;

  return (
    <div className="space-y-6">
      <div>
        <Link className="text-sm text-red-700 hover:text-red-900" href="/works">
          返回作品列表
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-stone-950">{work.title}</h1>
        <p className="mt-2 text-stone-600">作者：{work.author || "-"}</p>
      </div>

      <WorkExportButton workId={work.id} />

      <section className="rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="font-semibold text-stone-950">作品简介</h2>
        <p className="mt-3 text-stone-600">{work.description}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-stone-200 bg-white p-5">
          <p className="text-sm text-stone-500">作品ID</p>
          <p className="mt-2 text-lg font-semibold text-stone-950">{work.externalId || "未填写"}</p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-5">
          <p className="text-sm text-stone-500">品类</p>
          <p className="mt-2 text-lg font-semibold text-stone-950">{work.category || "-"}</p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-5">
          <p className="text-sm text-stone-500">封面文件 / 封面地址</p>
          <p className="mt-2 text-lg font-semibold text-stone-950">{work.coverFileName || "-"}</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-stone-200 bg-white p-5">
          <p className="text-sm text-stone-500">当前播放量</p>
          <p className="mt-2 text-lg font-semibold text-stone-950">{work.currentPlays ?? "-"}</p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-5">
          <p className="text-sm text-stone-500">当前点击率</p>
          <p className="mt-2 text-lg font-semibold text-stone-950">
            {work.currentCtr === null ? "-" : `${Math.round(work.currentCtr * 10000) / 100}%`}
          </p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-5">
          <p className="text-sm text-stone-500">当前完播率</p>
          <p className="mt-2 text-lg font-semibold text-stone-950">
            {work.currentFinish === null ? "-" : `${Math.round(work.currentFinish * 10000) / 100}%`}
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="font-semibold text-stone-950">备注</h2>
        <p className="mt-3 text-stone-600">{work.notes || "-"}</p>
      </section>

      <WorkIdentificationPanel workId={work.id} initialIdentification={initialIdentification} />
      <WorkRatingPanel
        identificationStatus={{
          confirmed: initialIdentification?.confirmed ?? false,
          confidence: initialIdentification?.confidence ?? null,
          hasIdentification: Boolean(initialIdentification),
        }}
        workId={work.id}
      />
      <WorkTitleIntroPanel workId={work.id} />
      <WorkCoverPanel workId={work.id} />
      <WorkReviewPanel workId={work.id} />
    </div>
  );
}

function safeJsonParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
