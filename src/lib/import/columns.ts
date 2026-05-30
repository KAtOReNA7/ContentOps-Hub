export const importColumns = [
  "作品 ID",
  "书名",
  "作者",
  "分类",
  "简介",
  "备注",
  "封面文件 / 封面地址",
  "当前播放量",
  "当前点击率",
  "当前完播率",
] as const;

export type ImportColumn = (typeof importColumns)[number];

export const requiredImportColumns: ImportColumn[] = ["书名"];

export const importColumnAliases = {
  externalId: ["作品ID", "作品 ID", "业务作品ID", "externalId", "sourceWorkId"],
  title: ["书名", "原书名", "作品名", "标题", "title"],
  author: ["作者", "作者名", "author"],
  category: ["分类", "品类", "题材", "category"],
  description: ["简介", "原简介", "内容简介", "intro", "description"],
  notes: ["备注", "运营备注", "notes", "remark"],
  coverFileName: [
    "封面",
    "封面文件",
    "封面地址",
    "封面URL",
    "封面链接",
    "封面文件名",
    "封面文件 / 封面地址",
    "cover",
    "coverUrl",
    "cover_url",
    "coverFileName",
  ],
  currentPlays: ["播放量", "当前播放量", "currentPlays", "playCount"],
  currentCtr: ["点击率", "当前点击率", "CTR", "ctr", "currentCtr"],
  currentFinish: ["完播率", "当前完播率", "finishRate", "currentFinish"],
} as const;

export const allImportColumnAliases = Object.values(importColumnAliases).flat();
