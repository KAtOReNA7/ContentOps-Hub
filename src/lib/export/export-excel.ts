import * as XLSX from "xlsx";
import type { ExportWorkRow } from "@/lib/export/export-types";

const legacySheetName = "作品运营建议";
const exportSheets: Array<{
  name: string;
  columns: Array<[string, string]>;
}> = [
  {
    name: "运营总览",
    columns: [
      ["作品 ID", "作品 ID"],
      ["原书名 title", "原书名"],
      ["作者 author", "作者"],
      ["品类 category", "品类"],
      ["审核状态", "审核状态"],
      ["作品评级 rating", "评级"],
      ["评级分数 score", "评级分数"],
      ["是否建议多书名运营 renameSuggestion", "多书名建议"],
      ["封面处理策略 strategy", "封面策略"],
      ["复盘推荐动作", "复盘推荐动作"],
      ["实际结果判断", "效果洞察"],
      ["最终书名", "最终书名"],
      ["最终封面地址", "最终封面"],
      ["风险点 risks", "风险摘要"],
    ],
  },
  {
    name: "识别与评级详情",
    columns: [
      ["作品 ID", "作品 ID"],
      ["原书名 title", "原书名"],
      ["作者 author", "作者"],
      ["识别匹配作品名", "识别匹配作品名"],
      ["识别匹配作者", "识别匹配作者"],
      ["识别置信度", "识别置信度"],
      ["识别理由", "识别理由"],
      ["识别风险", "识别风险"],
      ["是否人工确认", "识别是否人工确认"],
      ["人工确认书名", "人工确认书名"],
      ["人工确认作者", "人工确认作者"],
      ["作品评级 rating", "评级"],
      ["评级分数 score", "评级分数"],
      ["评级置信度 confidence", "评级置信度"],
      ["评级理由 reasons", "评级理由"],
      ["风险点 risks", "评级风险"],
      ["证据 evidence", "评级证据"],
    ],
  },
  {
    name: "书名简介方案",
    columns: [
      ["作品 ID", "作品 ID"],
      ["原书名 title", "原书名"],
      ["生成 provider", "生成来源"],
      ["生成策略 strategy", "生成策略"],
      ["策略说明 strategyReason", "策略说明"],
      ["是否建议多书名方案", "是否建议多书名方案"],
      ["新书名1", "新书名1"],
      ["新书名1理由", "新书名1理由"],
      ["新书名2", "新书名2"],
      ["新书名2理由", "新书名2理由"],
      ["新书名3", "新书名3"],
      ["新书名3理由", "新书名3理由"],
      ["新书名4", "新书名4"],
      ["新书名4理由", "新书名4理由"],
      ["新书名5", "新书名5"],
      ["新书名5理由", "新书名5理由"],
      ["新版简介", "新版简介"],
      ["简介优化理由", "简介优化理由"],
      ["封面Prompt", "封面 Prompt"],
    ],
  },
  {
    name: "封面处理",
    columns: [
      ["作品 ID", "作品 ID"],
      ["原书名 title", "原书名"],
      ["封面文件名 coverFileName", "封面文件名"],
      ["封面地址 remoteUrl", "封面地址"],
      ["封面评分 score", "封面评分"],
      ["封面评级 rating", "封面评级"],
      ["封面优点 strengths", "封面优点"],
      ["封面问题 weaknesses", "封面问题"],
      ["封面处理策略 strategy", "封面处理策略"],
      ["封面处理理由 reason", "封面处理理由"],
      ["封面人工确认策略 confirmedStrategy", "人工确认策略"],
      ["封面人工备注 note", "人工备注"],
      ["原图换标题1:1地址", "原图换标题 1:1"],
      ["原图换标题3:4地址", "原图换标题 3:4"],
      ["Image2重绘结果摘要", "Image2 重绘结果摘要"],
    ],
  },
  {
    name: "测试复盘",
    columns: [
      ["作品 ID", "作品 ID"],
      ["原书名 title", "原书名"],
      ["实验名称", "实验名称"],
      ["对照组 CTR", "对照组 CTR"],
      ["胜出组 CTR", "胜出组 CTR"],
      ["CTR 提升", "CTR 提升"],
      ["转化率提升", "转化率提升"],
      ["复盘结论", "复盘结论"],
      ["复盘置信度", "复盘置信度"],
      ["复盘推荐动作", "复盘推荐动作"],
    ],
  },
  {
    name: "效果回流",
    columns: [
      ["作品 ID", "作品 ID"],
      ["原书名 title", "原书名"],
      ["实际结果判断", "实际结果判断"],
      ["评级准确性", "评级准确性"],
      ["书名策略效果", "书名策略效果"],
      ["封面策略效果", "封面策略效果"],
      ["关键提升指标", "关键提升指标"],
      ["策略标签", "策略标签"],
      ["效果洞察摘要", "效果洞察摘要"],
      ["效果洞察风险提示", "效果洞察风险提示"],
    ],
  },
];

export function buildWorksExportWorkbook(rows: ExportWorkRow[]): Buffer {
  const workbook = XLSX.utils.book_new();
  appendSheet(workbook, legacySheetName, rows);

  for (const sheet of exportSheets) {
    const projectedRows = rows.map((row) =>
      Object.fromEntries(sheet.columns.map(([sourceKey, header]) => [header, row[sourceKey] ?? ""])),
    );
    appendSheet(workbook, sheet.name, projectedRows);
  }

  return XLSX.write(workbook, {
    bookType: "xlsx",
    type: "buffer",
  }) as Buffer;
}

function appendSheet(workbook: XLSX.WorkBook, sheetName: string, rows: ExportWorkRow[]) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const headers = Object.keys(rows[0] ?? {});

  worksheet["!cols"] = headers.map((header) => ({
    wch: getColumnWidth(header),
  }));
  worksheet["!rows"] = rows.map(() => ({ hpt: 32 }));
  applyReadableCellFormatting(worksheet, headers, rows.length);

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
}

function applyReadableCellFormatting(worksheet: XLSX.WorkSheet, headers: string[], rowCount: number) {
  for (let columnIndex = 0; columnIndex < headers.length; columnIndex += 1) {
    if (!isLongTextColumn(headers[columnIndex])) continue;

    for (let rowIndex = 1; rowIndex <= rowCount; rowIndex += 1) {
      const cell = worksheet[XLSX.utils.encode_cell({ c: columnIndex, r: rowIndex })];
      if (!cell) continue;
      cell.s = {
        ...(cell.s ?? {}),
        alignment: {
          ...cell.s?.alignment,
          vertical: "top",
          wrapText: true,
        },
      };
    }
  }
}

function isLongTextColumn(header: string) {
  return (
    header.includes("简介") ||
    header.includes("理由") ||
    header.includes("风险") ||
    header.includes("证据") ||
    header.includes("摘要") ||
    header.includes("Prompt")
  );
}

function getColumnWidth(header: string) {
  if (isLongTextColumn(header)) {
    return 42;
  }

  if (header.includes("地址")) {
    return 36;
  }

  return Math.min(Math.max(header.length + 4, 14), 24);
}
