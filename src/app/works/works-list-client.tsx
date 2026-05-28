"use client";

import Link from "next/link";
import { useState } from "react";
import { StatusBadge, reviewStatusLabel, reviewStatusTone } from "@/components/status-badge";
import { ExportWorksControls } from "@/app/works/export-all-button";

type WorkListItem = {
  author: string | null;
  category: string | null;
  description: string;
  externalId: string | null;
  id: string;
  reviewStatus: string;
  status: string;
  title: string;
};

type WorksListClientProps = {
  exportFilters: {
    author?: string;
    category?: string;
    externalId?: string;
    rating?: string;
    reviewStatus?: string;
    title?: string;
  };
  works: WorkListItem[];
};

export function WorksListClient({ exportFilters, works }: WorksListClientProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const allVisibleSelected = works.length > 0 && works.every((work) => selectedIds.includes(work.id));

  function toggleWork(id: string, checked: boolean) {
    setSelectedIds((current) => (checked ? Array.from(new Set([...current, id])) : current.filter((item) => item !== id)));
  }

  function toggleAllVisible(checked: boolean) {
    setSelectedIds((current) =>
      checked
        ? Array.from(new Set([...current, ...works.map((work) => work.id)]))
        : current.filter((id) => !works.some((work) => work.id === id)),
    );
  }

  return (
    <div className="space-y-4">
      <ExportWorksControls filters={exportFilters} selectedIds={selectedIds} />

      {works.length ? (
        <label className="inline-flex items-center gap-2 text-sm text-stone-600">
          <input checked={allVisibleSelected} onChange={(event) => toggleAllVisible(event.target.checked)} type="checkbox" />
          勾选当前页作品
        </label>
      ) : null}

      <section className="grid gap-4">
        {works.length === 0 ? (
          <div className="rounded-lg border border-stone-200 bg-white p-5 text-sm text-stone-600">
            暂无作品，请先导入 Excel/CSV。
          </div>
        ) : null}
        {works.map((work) => (
          <article className="rounded-lg border border-stone-200 bg-white p-5 transition hover:border-red-200" key={work.id}>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="flex gap-3">
                <input
                  aria-label={`选择 ${work.title}`}
                  checked={selectedIds.includes(work.id)}
                  className="mt-1"
                  onChange={(event) => toggleWork(work.id, event.target.checked)}
                  type="checkbox"
                />
                <div>
                  <Link className="text-lg font-semibold text-stone-950 hover:text-red-800" href={`/works/${work.id}`}>
                    {work.title}
                  </Link>
                  <p className="mt-1 text-sm text-stone-500">
                    作者：{work.author || "-"} | 品类：{work.category || "-"} | 作品ID：{work.externalId || "-"}
                  </p>
                  <p className="mt-3 max-w-3xl text-sm text-stone-600">{work.description}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge>{work.status}</StatusBadge>
                <StatusBadge tone={reviewStatusTone(work.reviewStatus)}>{reviewStatusLabel(work.reviewStatus)}</StatusBadge>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
