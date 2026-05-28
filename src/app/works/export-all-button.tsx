"use client";

import { useMemo, useState } from "react";

type ExportWorksControlsProps = {
  filters: {
    author?: string;
    category?: string;
    rating?: string;
    reviewStatus?: string;
    title?: string;
  };
  selectedIds: string[];
};

export function ExportWorksControls({ filters, selectedIds }: ExportWorksControlsProps) {
  const [error, setError] = useState("");
  const [isExporting, setIsExporting] = useState("");
  const query = useMemo(() => buildQuery(filters, selectedIds), [filters, selectedIds]);
  const filterQuery = useMemo(() => buildQuery(filters, []), [filters]);

  async function exportFile(url: string, fallbackFileName: string, label: string) {
    setError("");
    setIsExporting(label);

    try {
      await downloadFile(url, fallbackFileName);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "导出失败");
    } finally {
      setIsExporting("");
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-800 disabled:opacity-50"
          disabled={Boolean(isExporting)}
          onClick={() => exportFile(`/api/export/works${filterQuery}`, "works-filtered-export.xlsx", "filtered-excel")}
          type="button"
        >
          {isExporting === "filtered-excel" ? "导出中..." : "导出当前筛选 Excel"}
        </button>
        <button
          className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-800 disabled:opacity-50"
          disabled={Boolean(isExporting) || selectedIds.length === 0}
          onClick={() => exportFile(`/api/export/works${query}`, "works-selected-export.xlsx", "selected-excel")}
          type="button"
        >
          {isExporting === "selected-excel" ? "导出中..." : `导出已勾选 Excel（${selectedIds.length}）`}
        </button>
        <button
          className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:bg-stone-300"
          disabled={Boolean(isExporting)}
          onClick={() => exportFile(`/api/export/works/zip${filterQuery}`, "works-delivery.zip", "zip")}
          type="button"
        >
          {isExporting === "zip" ? "打包中..." : "导出当前筛选 ZIP 交付包"}
        </button>
      </div>
      <p className="text-xs text-stone-500">ZIP 包包含 Excel 和可读取到的最终采用封面；缺失封面不会中断导出。</p>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}

function buildQuery(filters: ExportWorksControlsProps["filters"], selectedIds: string[]): string {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value) query.set(key, value);
  }
  if (selectedIds.length) query.set("ids", selectedIds.join(","));

  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

async function downloadFile(url: string, fallbackFileName: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(await errorMessageFromResponse(response));
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileNameFromResponse(response) || fallbackFileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

async function errorMessageFromResponse(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { message?: string; errors?: string[] };
    return [`HTTP ${response.status}`, payload.message, payload.errors?.join("；")].filter(Boolean).join(" | ");
  } catch {
    return `HTTP ${response.status} | 导出失败`;
  }
}

function fileNameFromResponse(response: Response): string {
  const disposition = response.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename="?([^"]+)"?/i);

  return match?.[1] ? decodeURIComponent(match[1]) : "";
}
