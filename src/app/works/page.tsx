import Link from "next/link";
import { prisma } from "@/server/db";

type WorksPageProps = {
  searchParams: Promise<{
    title?: string;
    author?: string;
    category?: string;
    page?: string;
  }>;
};

const pageSize = 10;

export default async function WorksPage({ searchParams }: WorksPageProps) {
  const params = await searchParams;
  const page = Math.max(Number(params.page ?? "1") || 1, 1);
  const title = params.title?.trim() ?? "";
  const author = params.author?.trim() ?? "";
  const category = params.category?.trim() ?? "";
  const where = {
    AND: [
      title ? { title: { contains: title } } : {},
      author ? { author: { contains: author } } : {},
      category ? { category } : {},
    ],
  };
  const [works, total, categories] = await Promise.all([
    prisma.work.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.work.count({ where }),
    prisma.work.findMany({
      distinct: ["category"],
      select: { category: true },
      where: { category: { not: null } },
      orderBy: { category: "asc" },
    }),
  ]);
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const pageHref = (targetPage: number) => {
    const next = new URLSearchParams();
    if (title) next.set("title", title);
    if (author) next.set("author", author);
    if (category) next.set("category", category);
    next.set("page", String(targetPage));
    return `/works?${next.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-950">作品列表</h1>
        <p className="mt-2 text-stone-600">查看已入库作品，支持按书名、作者、品类筛选。</p>
      </div>

      <form className="grid gap-3 rounded-lg border border-stone-200 bg-white p-4 md:grid-cols-4">
        <input
          className="rounded-md border border-stone-300 px-3 py-2 text-sm"
          defaultValue={title}
          name="title"
          placeholder="按书名搜索"
        />
        <input
          className="rounded-md border border-stone-300 px-3 py-2 text-sm"
          defaultValue={author}
          name="author"
          placeholder="按作者搜索"
        />
        <select
          className="rounded-md border border-stone-300 px-3 py-2 text-sm"
          defaultValue={category}
          name="category"
        >
          <option value="">全部品类</option>
          {categories.map((item) =>
            item.category ? (
              <option key={item.category} value={item.category}>
                {item.category}
              </option>
            ) : null,
          )}
        </select>
        <button className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white" type="submit">
          筛选
        </button>
      </form>

      <section className="grid gap-4">
        {works.length === 0 ? (
          <div className="rounded-lg border border-stone-200 bg-white p-5 text-sm text-stone-600">
            暂无作品，请先导入 Excel/CSV。
          </div>
        ) : null}
        {works.map((work) => (
          <Link
            className="rounded-lg border border-stone-200 bg-white p-5 transition hover:border-red-200 hover:bg-red-50"
            href={`/works/${work.id}`}
            key={work.id}
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-stone-950">{work.title}</h2>
                <p className="mt-1 text-sm text-stone-500">
                  作者：{work.author || "-"} | 品类：{work.category || "-"} | 作品ID：{work.externalId || "-"}
                </p>
                <p className="mt-3 max-w-3xl text-sm text-stone-600">{work.description}</p>
              </div>
              <span className="w-fit rounded-md bg-stone-100 px-3 py-1 text-sm text-stone-700">
                {work.status}
              </span>
            </div>
          </Link>
        ))}
      </section>

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
