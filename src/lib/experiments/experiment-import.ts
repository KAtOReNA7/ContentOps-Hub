import type {
  ExperimentImportRow,
  NormalizedExperimentRow,
} from "@/lib/experiments/experiment-types";

export const experimentColumns = [
  "实验名称",
  "作品 ID",
  "书名",
  "作者",
  "组别",
  "实验组名称",
  "测试书名",
  "测试简介",
  "封面地址",
  "曝光量",
  "点击量",
  "点击率",
  "播放量",
  "转化量",
  "转化率",
  "完播率",
  "收入",
  "测试开始日期",
  "测试结束日期",
  "备注",
] as const;

export const experimentColumnAliases = {
  experimentName: ["实验名称", "测试名称", "批次名称", "experimentName"],
  externalId: ["作品ID", "作品 ID", "业务作品ID", "externalId", "sourceWorkId"],
  sourceTitle: ["书名", "作品名", "title"],
  author: ["作者", "作者名", "author"],
  groupType: ["组别", "分组", "groupType", "group"],
  variantName: ["实验组名称", "版本名称", "版本", "variantName"],
  testTitle: ["测试书名", "实验书名", "多书名", "titleVariant", "testTitle"],
  intro: ["测试简介", "实验简介", "简介", "introVariant", "testIntro", "intro"],
  coverUrl: ["封面", "封面地址", "封面URL", "coverUrl", "testCover"],
  exposureCount: ["曝光量", "展示量", "exposureCount", "impressions"],
  clickCount: ["点击量", "clickCount", "clicks"],
  ctr: ["点击率", "CTR", "ctr"],
  playCount: ["播放量", "playCount", "plays"],
  conversionCount: ["转化量", "conversionCount", "conversions"],
  conversionRate: ["转化率", "conversionRate"],
  finishRate: ["完播率", "finishRate", "completionRate"],
  revenue: ["收入", "revenue"],
  testStartDate: ["测试开始日期", "开始日期", "testStartDate", "startDate"],
  testEndDate: ["测试结束日期", "结束日期", "testEndDate", "endDate"],
  note: ["备注", "note", "notes", "remark"],
} as const;

export type ExperimentPreviewRow = NormalizedExperimentRow & {
  empty: boolean;
  errors: string[];
  warnings: string[];
  importable: boolean;
};

export function validateExperimentRows(rows: ExperimentImportRow[]): ExperimentPreviewRow[] {
  return rows.map((row, index) => validateExperimentRow(row, index + 2));
}

export function hasRequiredExperimentHeaders(rows: ExperimentImportRow[]) {
  const first = rows[0];
  if (!first) return { valid: false, message: "文件中没有测试结果数据。" };
  const hasGroup = hasAnyHeader(first, experimentColumnAliases.groupType);
  const hasWork = hasAnyHeader(first, experimentColumnAliases.externalId)
    || hasAnyHeader(first, experimentColumnAliases.sourceTitle);
  if (!hasGroup) return { valid: false, message: "缺少必填表头“组别”。" };
  if (!hasWork) return { valid: false, message: "缺少作品匹配表头。请填写“作品 ID”或“书名”。" };
  return { valid: true, message: "" };
}

function validateExperimentRow(row: ExperimentImportRow, rowNumber: number): ExperimentPreviewRow {
  const errors: string[] = [];
  const warnings: string[] = [];
  const empty = Object.values(row).every((value) => !text(value));
  const groupText = text(read(row, experimentColumnAliases.groupType));
  const groupType = parseGroup(groupText);
  const sourceTitle = text(read(row, experimentColumnAliases.sourceTitle));
  const externalId = text(read(row, experimentColumnAliases.externalId));
  const testTitle = text(read(row, experimentColumnAliases.testTitle)) || sourceTitle;
  const startDate = parseDate(read(row, experimentColumnAliases.testStartDate));
  const endDate = parseDate(read(row, experimentColumnAliases.testEndDate));
  const coverUrl = text(read(row, experimentColumnAliases.coverUrl));

  if (empty) {
    warnings.push("空行：导入时将跳过。");
  } else {
    if (!externalId && !sourceTitle) errors.push("作品 ID 或书名至少填写一个，用于匹配系统内作品。");
    if (!groupType) errors.push("组别填写错误。请填写“对照组”“实验组”“control”或“variant”。");
    validateNonNegativeInteger(row, experimentColumnAliases.exposureCount, "曝光量", errors);
    validateNonNegativeInteger(row, experimentColumnAliases.clickCount, "点击量", errors);
    validateNonNegativeInteger(row, experimentColumnAliases.playCount, "播放量", errors);
    validateNonNegativeInteger(row, experimentColumnAliases.conversionCount, "转化量", errors);
    validateRate(row, experimentColumnAliases.ctr, "点击率", errors);
    validateRate(row, experimentColumnAliases.conversionRate, "转化率", errors);
    validateRate(row, experimentColumnAliases.finishRate, "完播率", errors);
    validateNumber(row, experimentColumnAliases.revenue, "收入", errors);
    validateDate(row, experimentColumnAliases.testStartDate, "测试开始日期", errors);
    validateDate(row, experimentColumnAliases.testEndDate, "测试结束日期", errors);
    if (startDate && endDate && endDate < startDate) {
      errors.push("测试结束日期不能早于测试开始日期。请检查日期范围。");
    }
    if (coverUrl.includes("://") && !/^https?:\/\//i.test(coverUrl)) {
      errors.push("封面地址格式错误。URL 必须以 http:// 或 https:// 开头。");
    }
    if (!text(read(row, experimentColumnAliases.exposureCount))) warnings.push("曝光量为空。建议填写，用于判断数据可靠性。");
    if (!text(read(row, experimentColumnAliases.ctr)) && !text(read(row, experimentColumnAliases.clickCount))) {
      errors.push("点击率和点击量至少填写一个，用于判断点击表现。");
    }
    if (groupType === "variant" && !text(read(row, experimentColumnAliases.variantName))) {
      warnings.push("实验组名称为空。建议填写，便于区分多个测试版本。");
    }
  }

  return {
    rowNumber,
    externalId,
    sourceTitle,
    title: testTitle,
    author: text(read(row, experimentColumnAliases.author)),
    experimentName: text(read(row, experimentColumnAliases.experimentName)) || "默认多书名测试",
    groupType: groupType || "variant",
    variantName: nullableText(read(row, experimentColumnAliases.variantName)),
    intro: nullableText(read(row, experimentColumnAliases.intro)),
    coverUrl: nullableText(read(row, experimentColumnAliases.coverUrl)),
    exposureCount: integerOrNull(read(row, experimentColumnAliases.exposureCount)),
    clickCount: integerOrNull(read(row, experimentColumnAliases.clickCount)),
    ctr: rateOrNull(read(row, experimentColumnAliases.ctr)),
    playCount: integerOrNull(read(row, experimentColumnAliases.playCount)),
    conversionCount: integerOrNull(read(row, experimentColumnAliases.conversionCount)),
    conversionRate: rateOrNull(read(row, experimentColumnAliases.conversionRate)),
    finishRate: rateOrNull(read(row, experimentColumnAliases.finishRate)),
    revenue: numberOrNull(read(row, experimentColumnAliases.revenue)),
    testStartDate: startDate,
    testEndDate: endDate,
    note: nullableText(read(row, experimentColumnAliases.note)),
    empty,
    errors,
    warnings,
    importable: !empty && errors.length === 0,
  };
}

function validateNonNegativeInteger(row: ExperimentImportRow, keys: readonly string[], label: string, errors: string[]) {
  const raw = text(read(row, keys));
  if (raw && integerOrNull(raw) === null) errors.push(`${label}格式错误。请填写非负整数，不要填写中文单位。`);
}

function validateRate(row: ExperimentImportRow, keys: readonly string[], label: string, errors: string[]) {
  const raw = text(read(row, keys));
  if (raw && rateOrNull(raw) === null) errors.push(`${label}格式错误。请填写 8.5% 或 0.085。`);
}

function validateNumber(row: ExperimentImportRow, keys: readonly string[], label: string, errors: string[]) {
  const raw = text(read(row, keys));
  if (raw && numberOrNull(raw) === null) errors.push(`${label}格式错误。请填写数字，不要带单位。`);
}

function validateDate(row: ExperimentImportRow, keys: readonly string[], label: string, errors: string[]) {
  const raw = text(read(row, keys));
  if (raw && parseDate(raw) === null) errors.push(`${label}格式错误。请填写 YYYY-MM-DD。`);
}

function hasAnyHeader(row: ExperimentImportRow, keys: readonly string[]) {
  return keys.some((key) => Object.prototype.hasOwnProperty.call(row, key));
}

function parseGroup(value: string): "control" | "variant" | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === "对照组" || normalized === "control") return "control";
  if (normalized === "实验组" || normalized === "variant") return "variant";
  return null;
}

function integerOrNull(value: unknown) {
  const raw = text(value).replaceAll(",", "");
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function numberOrNull(value: unknown) {
  const raw = text(value).replaceAll(",", "");
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function rateOrNull(value: unknown) {
  const raw = text(value);
  if (!raw) return null;
  const percent = raw.endsWith("%");
  const parsed = Number(percent ? raw.slice(0, -1).trim() : raw);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  if (percent) return parsed <= 100 ? parsed / 100 : null;
  if (parsed <= 1) return parsed;
  return parsed <= 100 ? parsed / 100 : null;
}

function parseDate(value: unknown) {
  const raw = text(value);
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const parsed = new Date(`${raw}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function nullableText(value: unknown) {
  return text(value) || null;
}

function read(row: ExperimentImportRow, keys: readonly string[]) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && text(row[key])) return row[key];
  }
  return "";
}

function text(value: unknown) {
  return String(value ?? "").trim();
}
