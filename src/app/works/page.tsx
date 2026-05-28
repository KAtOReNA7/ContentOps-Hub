import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { WorksListClient } from "@/app/works/works-list-client";
import { prisma } from "@/server/db";

type WorksPageProps = {
  searchParams: Promise<{
    author?: string;
    category?: string;
    page?: string;
    rating?: string;
    reviewStatus?: string;
    title?: string;
  }>;
};

const pageSize = 10;
const reviewStatusLabels: Record<string, string> = {
  approved: "已采用",
  needs_revision: "需修改",
  on_hold: "暂缓",
  pending_review: "待审核",
  rejected: "已退回",
};

const ratingOptions = ["S", "A", "B", "C", "D"];

export default async function WorksPage({ searchParams }: WorksPageProps) {
  const params = await searchParams;
  const page = Math.max(Number(params.page ?? "1") || 1, 1);
  const title = params.title?.trim() ?? "";
  const author = params.author?.trim() ?? "";
  const category = params.category?.trim() ?? "";
  const reviewStatus = params.reviewStatus?.trim() ?? "";
  const rating = params.rating?.trim() ?? "";
  const where = {
    AND: [
      title ? { title: { contains: title } } : {},
      author ? { author: { contains: author } } : {},
      category ? { category } : {},
      reviewStatus ? { reviewStatus } : {},
      rating ? { ratings: { some: { rating } } } : {},
    ],
  } satisfies Prisma.WorkWhereInput;
  const [works, total, categories] = await Promise.all([
    prisma.work.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      where,
    }),
    prisma.work.count({ where }),
    prisma.work.findMany({
      distinct: ["category"],
      orderBy: { category: "asc" },
      select: { category: true },
      where: { category: { not: null } },
    }),
  ]);
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const pageHref = (targetPage: number) => {
    const next = new URLSearchParams();
    if (title) next.set("title", title);
    if (author) next.set("author", author);
    if (category) next.set("category", category);
    if (reviewStatus) next.set("reviewStatus", reviewStatus);
    if (rating) next.set("rating", rating);
    next.set("page", String(targetPage));
    return `/works?${next.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-950">作品列表</h1>
        <p className="mt-2 text-stone-600">查看已入库作品，支持搜索、筛选、勾选导出和按当前筛选条件导出。</p>
      </div>

      <form className="grid gap-3 rounded-lg border border-stone-200 bg-white p-4 md:grid-cols-6">
        <input className="rounded-md border border-stone-300 px-3 py-2 text-sm" defaultValue={title} name="title" placeholder="按书名搜索" />
        <input className="rounded-md border border-stone-300 px-3 py-2 text-sm" defaultValue={author} name="author" placeholder="按作者搜索" />
        <select className="rounded-md border border-stone-300 px-3 py-2 text-sm" defaultValue={category} name="category">
          <option value="">全部品类</option>
          {categories.map((item) =>
            item.category ? (
              <option key={item.category} value={item.category}>
                {item.category}
              </option>
            ) : null,
          )}
        </select>
        <select className="rounded-md border border-stone-300 px-3 py-2 text-sm" defaultValue={reviewStatus} name="reviewStatus">
          <option value="">全部审核状态</option>
          {Object.entries(reviewStatusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select className="rounded-md border border-stone-300 px-3 py-2 text-sm" defaultValue={rating} name="rating">
          <option value="">全部评级</option>
          {ratingOptions.map((item) => (
            <option key={item} value={item}>
              {item} 级
            </option>
          ))}
        </select>
        <button className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white" type="submit">
          筛选
        </button>
      </form>

      <WorksListClient
        exportFilters={{ author, category, rating, reviewStatus, title }}
        works={works.map((work) => ({
          author: work.author,
          category: work.category,
          description: work.description,
          externalId: work.externalId,
          id: work.id,
          reviewStatus: work.reviewStatus,
          status: work.status,
          title: work.title,
        }))}
      />

      <div className="flex items-center justify-between text-sm text-stone-600">
        <span>
          第 {page} / {totalPages} 页，共 {total} 条
        </span>
        <div className="flex gap-2">
          <Link
            aria-disabled={page <= 1}
            className="rounded-md border border-stone-300 px-3 py-2 aria-disabled:pointer-events-none aria-disabled:opacity-40"
            href={pageHref(Math.max(page - 1, 1))}
          >
            上一页
          </Link>
          <Link
            aria-disabled={page >= totalPages}
            className="rounded-md border border-stone-300 px-3 py-2 aria-disabled:pointer-events-none aria-disabled:opacity-40"
            href={pageHref(Math.min(page + 1, totalPages))}
          >
            下一页
          </Link>
        </div>
      </div>
    </div>
  );
}
