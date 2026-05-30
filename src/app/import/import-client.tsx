"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  hasExpectedImportColumn,
  hasTitleImportColumn,
  validateImportRows,
  type ImportPreviewRow,
  type RawImportRow,
} from "@/lib/import/validation";
import { importColumns } from "@/lib/import/columns";

const recommendedHeaders = importColumns.join(" | ");

type DuplicateResponse = {
  success?: boolean;
  message?: string;
  errors?: Array<{ reason?: string } | string>;
  externalIds: string[];
  titleAuthorKeys: string[];
};

type ImportError = {
  rowNumber: number;
  reason: string;
};

type ImportResponse = {
  success: boolean;
  message: string;
  total: number;
  created: number;
  skipped: number;
  skippedEmpty: number;
  errors: ImportError[];
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
        .map((error) => `第 ${error.rowNumber} 行：${error.reason}`)
        .slice(0, 5)
    : [];

  return [
    `HTTP ${status}`,
    data?.message || fallback,
    `失败行数：${data?.skipped ?? reasons.length}`,
    reasons.length ? `失败原因：${reasons.join("；")}` : "",
  ]
    .filter(Boolean)
    .join(" | ");
}

function formatRate(value: number | null): string {
  return value === null ? "-" : `${Math.round(value * 10000) / 100}%`;
}

export function ImportClient() {
  const [fileName, setFileName] = useState("");
  const [rawRows, setRawRows] = useState<RawImportRow[]>([]);
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [message, setMessage] = useState("");
  const [lastResult, setLastResult] = useState<ImportResponse | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [copied, setCopied] = useState(false);

  const summary = useMemo(() => {
    const empty = previewRows.filter((row) => row.empty).length;
    const importable = previewRows.filter((row) => row.importable).length;
    const blocked = previewRows.length - importable - empty;

    return { importable, blocked, empty, total: previewRows.length };
  }, [previewRows]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsParsing(true);
    setMessage("");
    setLastResult(null);
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        throw new Error("文件中没有可读取的工作表。");
      }

      const sheet = workbook.Sheets[firstSheetName];
      const parsedRows = XLSX.utils.sheet_to_json<RawImportRow>(sheet, {
        defval: "",
        raw: false,
      });

      if (parsedRows.length === 0) {
        throw new Error("文件中没有作品数据，请保留表头并至少填写一行作品。");
      }

      if (!hasExpectedImportColumn(parsedRows)) {
        throw new Error("未识别到支持的导入字段。请查看“上传文件填写规则”并使用推荐表头。");
      }

      if (!hasTitleImportColumn(parsedRows)) {
        throw new Error("缺少必填表头“书名”。也兼容“原书名”“作品名”“标题”或 title。");
      }

      const duplicateResponse = await fetch("/api/import/check-duplicates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: parsedRows }),
      });

      if (!duplicateResponse.ok) {
        throw new Error(
          formatApiError(
            duplicateResponse.status,
            await readApiJson(duplicateResponse),
            "重复作品检查失败。",
          ),
        );
      }

      const duplicates = (await duplicateResponse.json()) as DuplicateResponse;
      if (duplicates.success === false) {
        throw new Error(duplicates.message || "重复作品检查失败。");
      }

      setRawRows(parsedRows);
      setPreviewRows(
        validateImportRows(parsedRows, {
          externalIds: new Set(duplicates.externalIds),
          titleAuthorKeys: new Set(duplicates.titleAuthorKeys),
        }),
      );

      if (parsedRows.length > 500) {
        setMessage("当前文件超过 500 行。建议拆分导入，以便更快发现单行问题。");
      }
    } catch (error) {
      setRawRows([]);
      setPreviewRows([]);
      setMessage(error instanceof Error ? error.message : "文件解析失败。");
    } finally {
      setIsParsing(false);
    }
  }

  async function handleImport() {
    setIsImporting(true);
    setMessage("");
    setLastResult(null);

    try {
      const response = await fetch("/api/import/works", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: rawRows }),
      });
      const payload = (await readApiJson(response)) as ImportResponse | null;

      if (!response.ok) {
        throw new Error(formatApiError(response.status, payload, "导入失败。"));
      }

      if (!payload?.success) {
        throw new Error(formatApiError(response.status, payload, "导入失败。"));
      }

      setLastResult(payload);
      setMessage(payload.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "导入失败。");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-stone-200 bg-white p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <label className="block flex-1">
            <span className="text-sm font-medium text-stone-950">上传 .xlsx 或 .csv 文件</span>
            <input
              accept=".xlsx,.csv"
              className="mt-3 block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
              onChange={handleFileChange}
              type="file"
            />
          </label>
          <a
            className="inline-flex w-fit rounded-md border border-stone-300 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-100"
            href="/api/import/template"
          >
            下载作品导入模板
          </a>
        </div>
        <p className="mt-3 text-sm text-stone-600">
          {fileName ? `当前文件：${fileName}` : "请先查看填写规则。作品导入和多书名测试结果导入使用不同模板。"}
        </p>
        <p className="mt-2 text-sm text-stone-600">
          多书名测试结果请使用单独入口：
          <Link className="ml-1 text-red-700 hover:underline" href="/experiments/import">
            导入测试结果
          </Link>
        </p>
      </section>

      <details className="rounded-lg border border-stone-200 bg-white p-5" open>
        <summary className="cursor-pointer font-medium text-stone-950">上传文件填写规则</summary>
        <div className="mt-4 space-y-4 text-sm text-stone-700">
          <ul className="grid gap-2 md:grid-cols-2">
            <li>支持格式：.xlsx、.csv。</li>
            <li>第一行必须是表头，每行只填写一本作品。</li>
            <li>不要使用合并单元格，不要给 Excel 设置密码。</li>
            <li>表头不要带异常空格，不要上传临时副本文件。</li>
            <li>建议单次不超过 500 行，便于定位单行错误。</li>
            <li>必填字段只有“书名”；作品 ID、作者、简介、分类强烈建议填写。</li>
          </ul>
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
            <p className="font-medium text-blue-900">上传前检查清单</p>
            <p className="mt-2 leading-6 text-blue-800">第一行是表头；书名列不为空；不合并单元格；点击率填写 8.5% 或 0.085；不上传临时副本；不上传加密 Excel。</p>
          </div>
          <div className="rounded-md bg-stone-50 p-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <p className="font-medium text-stone-900">推荐表头，可直接复制</p>
              <button className="w-fit rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs hover:bg-stone-100" onClick={async () => { await navigator.clipboard.writeText(recommendedHeaders); setCopied(true); }} type="button">{copied ? "已复制" : "复制推荐表头"}</button>
            </div>
            <p className="mt-2 break-words text-xs leading-5 text-stone-600">{recommendedHeaders}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-stone-50 text-stone-600">
                <tr>
                  <th className="px-3 py-2">推荐表头</th>
                  <th className="px-3 py-2">填写规则</th>
                  <th className="px-3 py-2">重要程度</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                <tr><td className="px-3 py-2">作品 ID</td><td className="px-3 py-2">平台后台、Excel 清单或 CP 侧作品编号。</td><td className="px-3 py-2">强烈建议</td></tr>
                <tr><td className="px-3 py-2">书名</td><td className="px-3 py-2">不能为空。也兼容原书名、作品名、标题。</td><td className="px-3 py-2 font-medium text-red-700">必填</td></tr>
                <tr><td className="px-3 py-2">作者</td><td className="px-3 py-2">用于作品识别和重复判断。</td><td className="px-3 py-2">强烈建议</td></tr>
                <tr><td className="px-3 py-2">分类</td><td className="px-3 py-2">例如都市、悬疑、言情、玄幻。</td><td className="px-3 py-2">强烈建议</td></tr>
                <tr><td className="px-3 py-2">简介</td><td className="px-3 py-2">用于生成建议和运营判断。</td><td className="px-3 py-2">强烈建议</td></tr>
                <tr><td className="px-3 py-2">备注</td><td className="px-3 py-2">运营上下文，不进入作品价值评分。</td><td className="px-3 py-2">选填</td></tr>
                <tr><td className="px-3 py-2">封面文件 / 封面地址</td><td className="px-3 py-2">可填文件名或 http/https 图片地址。</td><td className="px-3 py-2">选填</td></tr>
                <tr><td className="px-3 py-2">当前播放量</td><td className="px-3 py-2">非负整数。</td><td className="px-3 py-2">选填</td></tr>
                <tr><td className="px-3 py-2">当前点击率</td><td className="px-3 py-2">支持 12%、0.12 或小数形式。</td><td className="px-3 py-2">选填</td></tr>
                <tr><td className="px-3 py-2">当前完播率</td><td className="px-3 py-2">支持 35%、0.35 或小数形式。</td><td className="px-3 py-2">选填</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </details>

      {previewRows.length > 0 ? (
        <section className="rounded-lg border border-stone-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-stone-200 px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-medium text-stone-950">导入预览</p>
              <p className="mt-1 text-sm text-stone-600">
                共 {summary.total} 行，可导入 {summary.importable} 行，需处理 {summary.blocked} 行，空行跳过 {summary.empty} 行。
              </p>
            </div>
            <button
              className="w-fit rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-stone-300"
              disabled={summary.importable === 0 || isImporting}
              onClick={handleImport}
              type="button"
            >
              {isImporting ? "导入中..." : "确认导入"}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1500px] text-left text-sm">
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
                  <tr className="border-t border-stone-100 align-top" key={`${row.rowNumber}-${row.externalId}-${row.title}`}>
                    <td className="px-4 py-3 text-stone-500">{row.rowNumber}</td>
                    <td className="px-4 py-3">{row.externalId || "-"}</td>
                    <td className="px-4 py-3 font-medium text-stone-950">{row.title || "-"}</td>
                    <td className="px-4 py-3">{row.author || "-"}</td>
                    <td className="px-4 py-3">{row.category || "-"}</td>
                    <td className="max-w-xs px-4 py-3">{row.description || "-"}</td>
                    <td className="max-w-xs px-4 py-3">{row.notes || "-"}</td>
                    <td className="max-w-xs px-4 py-3">{row.coverFileName || "-"}</td>
                    <td className="px-4 py-3">{row.currentPlays ?? "-"}</td>
                    <td className="px-4 py-3">{formatRate(row.currentCtr)}</td>
                    <td className="px-4 py-3">{formatRate(row.currentFinish)}</td>
                    <td className="px-4 py-3">
                      <div className="flex max-w-sm flex-wrap gap-2">
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

      {lastResult ? (
        <section className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
          <p className="font-medium">导入结果</p>
          <p className="mt-2">
            总行数 {lastResult.total}，成功创建 {lastResult.created}，失败或重复跳过 {lastResult.skipped}，空行跳过 {lastResult.skippedEmpty}。
          </p>
          {lastResult.errors.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {lastResult.errors.slice(0, 10).map((error) => (
                <li key={`${error.rowNumber}-${error.reason}`}>第 {error.rowNumber} 行：{error.reason}</li>
              ))}
            </ul>
          ) : null}
          <Link className="mt-3 inline-flex text-red-700 hover:underline" href="/works">
            查看作品列表
          </Link>
        </section>
      ) : null}

      {isParsing ? <p className="text-sm text-stone-600">解析中...</p> : null}
      {message ? <p className="rounded-md bg-stone-100 px-4 py-3 text-sm text-stone-700">{message}</p> : null}
    </div>
  );
}
