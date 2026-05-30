"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  experimentColumns,
  hasRequiredExperimentHeaders,
  validateExperimentRows,
  type ExperimentPreviewRow,
} from "@/lib/experiments/experiment-import";

type RawRow = Record<string, unknown>;

type ImportData = {
  imported: number;
  failed: number;
  skippedEmpty: number;
  matchedWorks: number;
  unmatchedWorks: number;
  reviewsCreated: number;
  unableToReview: number;
  errors: Array<{ rowNumber: number; reason: string }>;
};

type ImportPayload = {
  success: boolean;
  data?: ImportData;
  message?: string;
  errors?: string[];
};

const fieldRules = [
  ["实验名称", "建议填写", "区分不同批次的多书名测试", "2026年6月第一批多书名测试"],
  ["作品 ID", "强烈建议", "业务侧作品编号，不是系统内部数据库 ID", "FT-10001"],
  ["书名", "建议填写", "作品当前书名，用于辅助匹配", "黑暗生存游戏"],
  ["作者", "选填", "辅助匹配作品，避免重名", "曹操不迟到"],
  ["组别", "必填", "对照组 / 实验组 / control / variant", "实验组"],
  ["实验组名称", "实验组建议填写", "区分多个实验版本", "强冲突标题版"],
  ["测试书名", "建议填写", "该组实际参与测试的书名", "离婚后，前夫跪求我复合"],
  ["测试简介", "选填", "该组实际参与测试的简介", "她离开豪门后……"],
  ["封面地址", "选填", "该组使用的 http/https 封面地址", "https://example.com/cover.jpg"],
  ["曝光量", "建议必填", "非负整数，不要填写中文单位", "10000"],
  ["点击量", "点击率缺失时填写", "非负整数", "860"],
  ["点击率", "点击量缺失时填写", "支持百分比或小数", "8.6% / 0.086"],
  ["播放量", "选填", "测试期间播放量，非负整数", "3200"],
  ["转化量", "选填", "平台定义的转化次数，非负整数", "420"],
  ["转化率", "建议填写", "支持百分比或小数", "12.5% / 0.125"],
  ["完播率", "选填", "支持百分比或小数", "32% / 0.32"],
  ["收入", "选填", "数字，不要带“元”", "1280.50"],
  ["测试开始日期", "建议填写", "格式 YYYY-MM-DD", "2026-06-01"],
  ["测试结束日期", "建议填写", "格式 YYYY-MM-DD", "2026-06-07"],
  ["备注", "选填", "运营补充说明", "该组使用强冲突标题"],
];

export function ExperimentImportClient() {
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<RawRow[]>([]);
  const [previewRows, setPreviewRows] = useState<ExperimentPreviewRow[]>([]);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<ImportData | null>(null);
  const [loading, setLoading] = useState(false);

  const previewSummary = useMemo(() => ({
    total: previewRows.length,
    importable: previewRows.filter((row) => row.importable).length,
    blocked: previewRows.filter((row) => !row.importable && !row.empty).length,
    empty: previewRows.filter((row) => row.empty).length,
  }), [previewRows]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setMessage("");
    setResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheet = workbook.SheetNames[0];
      if (!firstSheet) throw new Error("文件中没有可读取的工作表。");
      const parsedRows = XLSX.utils.sheet_to_json<RawRow>(workbook.Sheets[firstSheet], {
        defval: "",
        raw: false,
      });
      const headerCheck = hasRequiredExperimentHeaders(parsedRows);
      if (!headerCheck.valid) throw new Error(headerCheck.message);
      setRows(parsedRows);
      setPreviewRows(validateExperimentRows(parsedRows));
      setMessage(
        parsedRows.length > 1000
          ? `已解析 ${parsedRows.length} 行。文件超过 1000 行，建议拆分导入，避免浏览器卡顿。`
          : `已解析 ${parsedRows.length} 行测试结果，请确认校验结果后导入。`,
      );
    } catch (error) {
      setRows([]);
      setPreviewRows([]);
      setMessage(error instanceof Error ? error.message : "文件解析失败。");
    }
  }

  async function handleImport() {
    setLoading(true);
    setMessage("");
    setResult(null);

    try {
      const response = await fetch("/api/experiments/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const payload = (await response.json()) as ImportPayload;

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error([payload.message || `HTTP ${response.status}`, ...(payload.errors || [])].join(" | "));
      }

      setResult(payload.data);
      setMessage("测试结果导入完成。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "导入测试结果失败。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-stone-200 bg-white p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <label className="block flex-1">
            <span className="text-sm font-medium text-stone-950">上传测试结果 .xlsx / .csv</span>
            <input
              accept=".xlsx,.csv"
              className="mt-3 block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
              onChange={handleFileChange}
              type="file"
            />
          </label>
          <a
            className="inline-flex w-fit rounded-md border border-stone-300 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-100"
            href="/api/experiments/template"
          >
            下载多书名测试结果模板
          </a>
        </div>
        <p className="mt-3 text-sm text-stone-600">
          {fileName ? `当前文件：${fileName}` : "测试结果导入用于回流对照组和实验组数据，不是作品基础信息导入。"}
        </p>
        <p className="mt-2 text-sm text-stone-600">
          导入待分析作品请前往：
          <Link className="ml-1 text-red-700 hover:underline" href="/import">作品导入</Link>
        </p>
      </section>

      <details className="rounded-lg border border-stone-200 bg-white p-5" open>
        <summary className="cursor-pointer font-medium text-stone-950">多书名测试结果导入填写规则</summary>
        <div className="mt-4 space-y-4 text-sm text-stone-700">
          <ul className="grid gap-2 md:grid-cols-2">
            <li>支持 .xlsx 和 .csv，第一行必须是表头。</li>
            <li>每行代表一个测试组结果。</li>
            <li>同一作品同一实验至少需要 1 行对照组和 1 行实验组，才能生成完整复盘。</li>
            <li>不要合并单元格，不要使用密码保护 Excel。</li>
            <li>表头不要带多余空格或特殊符号，不要上传临时副本。</li>
            <li>建议单次不超过 1000 行，避免浏览器卡顿。</li>
          </ul>
          <div className="rounded-md bg-stone-50 p-3 text-xs leading-6 text-stone-700">
            推荐表头：{experimentColumns.join(" | ")}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-stone-50 text-stone-600">
                <tr><th className="px-3 py-2">字段</th><th className="px-3 py-2">重要程度</th><th className="px-3 py-2">填写说明</th><th className="px-3 py-2">示例</th></tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {fieldRules.map(([field, level, description, example]) => (
                  <tr key={field}>
                    <td className="px-3 py-2 font-medium text-stone-900">{field}</td>
                    <td className="px-3 py-2">{level}</td>
                    <td className="px-3 py-2">{description}</td>
                    <td className="px-3 py-2 text-stone-500">{example}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 leading-6 text-amber-900">
            系统按“作品 + 实验名称”聚合同一次测试。对照组用于基准，实验组用于比较。缺少任一组时数据仍可导入，但暂时无法生成完整复盘。复盘结果不会自动覆盖最终采用结果，只有人工确认后才会写入。
          </div>
        </div>
      </details>

      {previewRows.length ? (
        <section className="rounded-lg border border-stone-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-stone-200 px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-medium text-stone-950">导入预览</p>
              <p className="mt-1 text-sm text-stone-600">
                共 {previewSummary.total} 行，可导入 {previewSummary.importable} 行，需处理 {previewSummary.blocked} 行，空行跳过 {previewSummary.empty} 行。
              </p>
            </div>
            <button
              className="w-fit rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-stone-300"
              disabled={loading || previewSummary.importable === 0}
              onClick={handleImport}
              type="button"
            >
              {loading ? "导入中..." : "确认导入测试结果"}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-left text-sm">
              <thead className="bg-stone-50 text-stone-500">
                <tr><th className="px-3 py-2">行号</th><th className="px-3 py-2">作品 ID</th><th className="px-3 py-2">书名</th><th className="px-3 py-2">组别</th><th className="px-3 py-2">实验组名称</th><th className="px-3 py-2">曝光量</th><th className="px-3 py-2">点击率</th><th className="px-3 py-2">校验结果</th></tr>
              </thead>
              <tbody>
                {previewRows.slice(0, 100).map((row) => (
                  <tr className="border-t border-stone-100 align-top" key={row.rowNumber}>
                    <td className="px-3 py-2">{row.rowNumber}</td><td className="px-3 py-2">{row.externalId || "-"}</td><td className="px-3 py-2">{row.sourceTitle || "-"}</td><td className="px-3 py-2">{row.groupType === "control" ? "对照组" : "实验组"}</td><td className="px-3 py-2">{row.variantName || "-"}</td><td className="px-3 py-2">{row.exposureCount ?? "-"}</td><td className="px-3 py-2">{formatRate(row.ctr)}</td>
                    <td className="px-3 py-2"><div className="flex max-w-md flex-wrap gap-1">{row.errors.map((item) => <span className="rounded bg-red-50 px-2 py-1 text-xs text-red-700" key={item}>{item}</span>)}{row.warnings.map((item) => <span className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-700" key={item}>{item}</span>)}{!row.errors.length && !row.warnings.length ? <span className="rounded bg-green-50 px-2 py-1 text-xs text-green-700">可导入</span> : null}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {result ? (
        <section className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
          <p className="font-medium">导入结果摘要</p>
          <p className="mt-2">总行数 {rows.length}，成功导入 {result.imported}，失败 {result.failed}，空行跳过 {result.skippedEmpty}。</p>
          <p className="mt-1">匹配作品 {result.matchedWorks}，未匹配作品 {result.unmatchedWorks}，可生成复盘 {result.reviewsCreated}，暂无法复盘 {result.unableToReview}。</p>
          {result.errors.length ? <ul className="mt-2 list-disc space-y-1 pl-5">{result.errors.slice(0, 10).map((item) => <li key={`${item.rowNumber}-${item.reason}`}>第 {item.rowNumber} 行：{item.reason}</li>)}</ul> : null}
        </section>
      ) : null}
      {message ? <p className="rounded-md bg-stone-100 px-4 py-3 text-sm text-stone-700">{message}</p> : null}
    </div>
  );
}

function formatRate(value: number | null) {
  return value === null ? "-" : `${Math.round(value * 10000) / 100}%`;
}
