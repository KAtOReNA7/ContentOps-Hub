export const importColumns = [
  "作品ID",
  "原书名",
  "作者名",
  "原简介",
  "封面文件名",
  "品类",
  "当前播放量",
  "当前点击率",
  "当前完播率",
  "备注",
] as const;

export type ImportColumn = (typeof importColumns)[number];

export const requiredImportColumns: ImportColumn[] = ["作品ID", "原书名", "作者名", "原简介"];
