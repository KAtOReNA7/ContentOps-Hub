import { importColumns, requiredImportColumns } from "@/lib/import/columns";

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
};

export type DuplicateKeySet = {
  externalIds?: Set<string>;
  titleAuthorKeys?: Set<string>;
};

const coverColumnAliases = [
  "封面地址",
  "封面URL",
  "封面链接",
  "封面文件名",
  "coverUrl",
  "cover_url",
  "coverFileName",
];

function cellToString(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function cellByAliases(raw: RawImportRow, aliases: string[]): string {
  for (const alias of aliases) {
    const value = cellToString(raw[alias]);

    if (value) {
      return value;
    }
  }

  return "";
}

export function isRemoteCoverUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

function parseInteger(value: unknown): number | null {
  const text = cellToString(value).replaceAll(",", "");

  if (!text) {
    return null;
  }

  const parsed = Number(text);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : null;
}

export function parseRate(value: unknown): number | null {
  const text = cellToString(value);

  if (!text) {
    return null;
  }

  const normalized = text.endsWith("%") ? text.slice(0, -1).trim() : text;
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  if (text.endsWith("%")) {
    return parsed <= 100 ? parsed / 100 : null;
  }

  if (parsed <= 1) {
    return parsed;
  }

  return parsed <= 100 ? parsed / 100 : null;
}

export function titleAuthorKey(title: string, author: string): string {
  return `${title.trim().toLowerCase()}::${author.trim().toLowerCase()}`;
}

export function normalizeImportRow(raw: RawImportRow, index: number): NormalizedImportRow {
  return {
    rowNumber: index + 2,
    externalId: cellToString(raw["作品ID"]),
    title: cellToString(raw["原书名"]),
    author: cellToString(raw["作者名"]),
    description: cellToString(raw["原简介"]),
    coverFileName: cellByAliases(raw, coverColumnAliases),
    category: cellToString(raw["品类"]),
    currentPlays: parseInteger(raw["当前播放量"]),
    currentCtr: parseRate(raw["当前点击率"]),
    currentFinish: parseRate(raw["当前完播率"]),
    notes: cellToString(raw["备注"]),
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

    for (const column of requiredImportColumns) {
      if (!cellToString(raw[column])) {
        errors.push(`缺失必填字段：${column}`);
      }
    }

    if (!row.title) {
      errors.push("空书名");
    }

    if (!row.author) {
      errors.push("空作者");
    }

    if (cellToString(raw["当前点击率"]) && row.currentCtr === null) {
      errors.push("点击率格式异常");
    }

    if (cellToString(raw["当前完播率"]) && row.currentFinish === null) {
      errors.push("完播率格式异常");
    }

    if (!row.coverFileName) {
      warnings.push("封面文件 / 封面地址缺失");
    }

    if (row.externalId) {
      if (seenExternalIds.has(row.externalId) || duplicates.externalIds?.has(row.externalId)) {
        errors.push("重复作品");
      }
      seenExternalIds.add(row.externalId);
    }

    if (row.title && row.author) {
      const key = titleAuthorKey(row.title, row.author);
      if (seenTitleAuthorKeys.has(key) || duplicates.titleAuthorKeys?.has(key)) {
        errors.push("重复作品");
      }
      seenTitleAuthorKeys.add(key);
    }

    return {
      ...row,
      errors: Array.from(new Set(errors)),
      warnings: Array.from(new Set(warnings)),
      importable: errors.length === 0,
    };
  });
}

export function hasExpectedImportColumn(rawRows: RawImportRow[]): boolean {
  const first = rawRows[0];

  if (!first) {
    return false;
  }

  return importColumns.some((column) => Object.prototype.hasOwnProperty.call(first, column));
}
