"use client";

import { useState } from "react";

export function ExportAllWorksButton() {
  const [error, setError] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  async function exportAllWorks() {
    setError("");
    setIsExporting(true);

    try {
      await downloadExcel("/api/export/works", "works-export.xlsx");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "导出失败");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-800 disabled:opacity-50"
        disabled={isExporting}
        onClick={exportAllWorks}
        type="button"
      >
        {isExporting ? "导出中" : "导出全部作品 Excel"}
      </button>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}

async function downloadExcel(url: string, fallbackFileName: string) {
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
