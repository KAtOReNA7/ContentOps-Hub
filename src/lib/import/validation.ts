import { allImportColumnAliases, importColumnAliases } from "@/lib/import/columns";

export type RawImportRow = Record<string, unknown>;

export type NormalizedImportRow = {
  rowNumber: number;
  externalId: string;
  title: string;
  author: string;
  description: string;
  coverFileName: string;
  category: string;
  currentPlays: number | null;
  currentCtr: number | null;
  currentFinish: number | null;
  notes: string;
};

export type ImportPreviewRow = NormalizedImportRow & {
  errors: string[];
  warnings: string[];
  importable: boolean;
  empty: boolean;
};

export type DuplicateKeySet = {
  externalIds?: Set<string>;
  titleAuthorKeys?: Set<string>;
};

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function cellByAliases(raw: RawImportRow, aliases: readonly string[]): string {
  for (const alias of aliases) {
    const value = cellToString(raw[alias]);
    if (value) return value;
  }
  return "";
}

export function isRemoteCoverUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

function parseInteger(value: unknown): number | null {
  const text = cellToString(value).replaceAll(",", "");
  if (!text) return null;
  const parsed = Number(text);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function parseRate(value: unknown): number | null {
  const text = cellToString(value);
  if (!text) return null;
  const normalized = text.endsWith("%") ? text.slice(0, -1).trim() : text;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  if (text.endsWith("%")) return parsed <= 100 ? parsed / 100 : null;
  if (parsed <= 1) return parsed;
  return parsed <= 100 ? parsed / 100 : null;
}

export function titleAuthorKey(title: string, author: string): string {
  return `${title.trim().toLowerCase()}::${author.trim().toLowerCase()}`;
}

export function normalizeImportRow(raw: RawImportRow, index = 0): NormalizedImportRow {
  return {
    rowNumber: index + 2,
    externalId: cellByAliases(raw, importColumnAliases.externalId),
    title: cellByAliases(raw, importColumnAliases.title),
    author: cellByAliases(raw, importColumnAliases.author),
    description: cellByAliases(raw, importColumnAliases.description),
    coverFileName: cellByAliases(raw, importColumnAliases.coverFileName),
    category: cellByAliases(raw, importColumnAliases.category),
    currentPlays: parseInteger(cellByAliases(raw, importColumnAliases.currentPlays)),
    currentCtr: parseRate(cellByAliases(raw, importColumnAliases.currentCtr)),
    currentFinish: parseRate(cellByAliases(raw, importColumnAliases.currentFinish)),
    notes: cellByAliases(raw, importColumnAliases.notes),
  };
}

export function validateImportRows(
  rawRows: RawImportRow[],
  duplicates: DuplicateKeySet = {},
): ImportPreviewRow[] {
  const seenExternalIds = new Set<string>();
  const seenTitleAuthorKeys = new Set<string>();

  return rawRows.map((raw, index) => {
    const row = normalizeImportRow(raw, index);
    const errors: string[] = [];
    const warnings: string[] = [];
    const empty = isEmptyRawRow(raw);
    const rawPlays = cellByAliases(raw, importColumnAliases.currentPlays);
    const rawCtr = cellByAliases(raw, importColumnAliases.currentCtr);
    const rawFinish = cellByAliases(raw, importColumnAliases.currentFinish);

    if (empty) {
      warnings.push("空行：导入时将跳过。");
    } else {
      if (!row.title) errors.push("书名为空。请填写作品当前书名。");
      if (!row.author) warnings.push("作者为空。建议填写作者，用于搜索识别和排除重名作品。");
      if (!row.externalId) warnings.push("作品 ID 为空。建议填写业务侧作品编号，便于后续导出交付。");
      if (!row.description) warnings.push("简介为空。建议填写简介，用于识别和包装判断。");
      if (!row.category) warnings.push("分类为空。建议填写题材或运营分类。");
      if (!row.coverFileName) warnings.push("封面文件 / 封面地址为空。");
      if (rawPlays && row.currentPlays === null) {
        errors.push("当前播放量格式错误。请填写非负整数，例如 120000，不要填写“12万”。");
      }
      if (rawCtr && row.currentCtr === null) {
        errors.push("当前点击率格式错误。请填写 8.5% 或 0.085。");
      }
      if (rawFinish && row.currentFinish === null) {
        errors.push("当前完播率格式错误。请填写 32% 或 0.32。");
      }
      if (row.coverFileName.includes("://") && !isRemoteCoverUrl(row.coverFileName)) {
        errors.push("封面地址格式错误。远程 URL 必须以 http:// 或 https:// 开头。");
      }
      if (row.externalId) {
        if (seenExternalIds.has(row.externalId) || duplicates.externalIds?.has(row.externalId)) {
          warnings.push("作品 ID 重复。请确认是否为同一作品；导入时重复作品会跳过。");
        }
        seenExternalIds.add(row.externalId);
      }
      if (row.title && row.author) {
        const key = titleAuthorKey(row.title, row.author);
        if (seenTitleAuthorKeys.has(key) || duplicates.titleAuthorKeys?.has(key)) {
          warnings.push("书名 + 作者重复。请确认是否为同一作品；导入时重复作品会跳过。");
        }
        seenTitleAuthorKeys.add(key);
      }
    }

    return {
      ...row,
      empty,
      errors: Array.from(new Set(errors)),
      warnings: Array.from(new Set(warnings)),
      importable: !empty && errors.length === 0,
    };
  });
}

export function hasExpectedImportColumn(rawRows: RawImportRow[]): boolean {
  const first = rawRows[0];
  if (!first) return false;
  return allImportColumnAliases.some((column) =>
    Object.prototype.hasOwnProperty.call(first, column),
  );
}

export function hasTitleImportColumn(rawRows: RawImportRow[]): boolean {
  const first = rawRows[0];
  if (!first) return false;
  return importColumnAliases.title.some((column) =>
    Object.prototype.hasOwnProperty.call(first, column),
  );
}

function isEmptyRawRow(raw: RawImportRow): boolean {
  return Object.values(raw).every((value) => !cellToString(value));
}
