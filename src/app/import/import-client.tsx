"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { hasExpectedImportColumn, validateImportRows, type ImportPreviewRow, type RawImportRow } from "@/lib/import/validation";
import { importColumns } from "@/lib/import/columns";

type DuplicateResponse = {
  success?: boolean;
  message?: string;
  errors?: Array<{ reason?: string } | string>;
  externalIds: string[];
  titleAuthorKeys: string[];
};

type ImportResponse = {
  success: boolean;
  message: string;
  created: number;
  skipped: number;
  errors: Array<{ rowNumber: number; reason: string }>;
};

async function readApiJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function formatApiError(status: number, payload: unknown, fallback: string): string {
  const data = payload as Partial<ImportResponse> | null;
  const reasons = Array.isArray(data?.errors)
    ? data.errors
        .map((error) => {
          if (typeof error === "string") {
            return error;
          }

          return error.reason ? `第 ${error.rowNumber} 行：${error.reason}` : "";
        })
        .filter(Boolean)
    : [];

  return [
    `HTTP ${status}`,
    data?.message || fallback,
    `失败行数：${reasons.length}`,
    reasons.length ? `失败原因：${reasons.slice(0, 5).join("；")}` : "",
  ]
    .filter(Boolean)
    .join(" | ");
}

export function ImportClient() {
  const router = useRouter();
  const [fileName, setFileName] = useState("");
  const [rawRows, setRawRows] = useState<RawImportRow[]>([]);
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [message, setMessage] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const summary = useMemo(() => {
    const importable = previewRows.filter((row) => row.importable).length;
    const blocked = previewRows.length - importable;

    return { importable, blocked, total: previewRows.length };
  }, [previewRows]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsParsing(true);
    setMessage("");
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const parsedRows = XLSX.utils.sheet_to_json<RawImportRow>(sheet, {
        defval: "",
        raw: false,
      });

      if (!hasExpectedImportColumn(parsedRows)) {
        setRawRows([]);
        setPreviewRows([]);
        setMessage("未识别到导入模板字段，请确认表头是否符合格式。");
        return;
      }

      const duplicateResponse = await fetch("/api/import/check-duplicates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: parsedRows }),
      });

      if (!duplicateResponse.ok) {
        throw new Error(formatApiError(duplicateResponse.status, await readApiJson(duplicateResponse), "重复作品检查失败"));
      }

      const duplicates = (await duplicateResponse.json()) as DuplicateResponse;
      if (duplicates.success === false) {
        throw new Error(duplicates.message || "重复作品检查失败");
      }
      setRawRows(parsedRows);
      setPreviewRows(
        validateImportRows(parsedRows, {
          externalIds: new Set(duplicates.externalIds),
          titleAuthorKeys: new Set(duplicates.titleAuthorKeys),
        }),
      );
    } catch (error) {
      setRawRows([]);
      setPreviewRows([]);
      setMessage(error instanceof Error ? error.message : "文件解析失败");
    } finally {
      setIsParsing(false);
    }
  }

  async function handleImport() {
    setIsImporting(true);
    setMessage("");

    try {
      const response = await fetch("/api/import/works", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: rawRows }),
      });
      const payload = (await readApiJson(response)) as ImportResponse | null;

      if (!response.ok) {
        throw new Error(formatApiError(response.status, payload, "导入失败"));
      }

      if (!payload?.success) {
        throw new Error(formatApiError(response.status, payload, "导入失败"));
      }

      const errorSummary = payload.errors.length
        ? `失败行数：${payload.errors.length}；失败原因：${payload.errors
            .slice(0, 5)
            .map((error) => `第 ${error.rowNumber} 行 ${error.reason}`)
            .join("；")}`
        : "";
      setMessage(`${payload.message}${errorSummary ? ` ${errorSummary}` : ""}`);
      if (payload.created > 0) {
        router.push("/works");
        router.refresh();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "导入失败");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-dashed border-stone-300 bg-white p-6">
        <label className="block">
          <span className="text-sm font-medium text-stone-950">上传 .xlsx 或 .csv 文件</span>
          <input
            accept=".xlsx,.csv"
            className="mt-3 block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
            onChange={handleFileChange}
            type="file"
          />
        </label>
        <p className="mt-3 text-sm text-stone-600">
          {fileName ? `当前文件：${fileName}` : "请使用 sample/input-template.xlsx 或 docs/import-format.md 中说明的字段。"}
        </p>
      </section>

      {previewRows.length > 0 ? (
        <section className="rounded-lg border border-stone-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-stone-200 px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-medium text-stone-950">导入预览</p>
              <p className="mt-1 text-sm text-stone-600">
                共 {summary.total} 条，可导入 {summary.importable} 条，需处理 {summary.blocked} 条。
              </p>
            </div>
            <button
              className="w-fit rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-stone-300"
              disabled={summary.importable === 0 || isImporting}
              onClick={handleImport}
              type="button"
            >
              {isImporting ? "导入中" : "确认导入"}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-left text-sm">
              <thead className="bg-stone-50 text-stone-500">
                <tr>
                  <th className="px-4 py-3">行号</th>
                  {importColumns.map((column) => (
                    <th className="px-4 py-3" key={column}>{column}</th>
                  ))}
                  <th className="px-4 py-3">校验结果</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row) => (
                  <tr className="border-t border-stone-100" key={`${row.rowNumber}-${row.externalId}-${row.title}`}>
                    <td className="px-4 py-3 text-stone-500">{row.rowNumber}</td>
                    <td className="px-4 py-3">{row.externalId}</td>
                    <td className="px-4 py-3 font-medium text-stone-950">{row.title || "-"}</td>
                    <td className="px-4 py-3">{row.author || "-"}</td>
                    <td className="px-4 py-3">{row.description || "-"}</td>
                    <td className="px-4 py-3">{row.coverFileName || "-"}</td>
                    <td className="px-4 py-3">{row.category || "-"}</td>
                    <td className="px-4 py-3">{row.currentPlays ?? "-"}</td>
                    <td className="px-4 py-3">{row.currentCtr === null ? "-" : `${Math.round(row.currentCtr * 10000) / 100}%`}</td>
                    <td className="px-4 py-3">{row.currentFinish === null ? "-" : `${Math.round(row.currentFinish * 10000) / 100}%`}</td>
                    <td className="px-4 py-3">{row.notes || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {row.errors.length === 0 && row.warnings.length === 0 ? (
                          <span className="rounded-md bg-green-50 px-2 py-1 text-xs text-green-700">可导入</span>
                        ) : null}
                        {row.errors.map((error) => (
                          <span className="rounded-md bg-red-50 px-2 py-1 text-xs text-red-700" key={error}>{error}</span>
                        ))}
                        {row.warnings.map((warning) => (
                          <span className="rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-700" key={warning}>{warning}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {isParsing ? <p className="text-sm text-stone-600">解析中...</p> : null}
      {message ? <p className="rounded-md bg-stone-100 px-4 py-3 text-sm text-stone-700">{message}</p> : null}
    </div>
  );
}
