import * as XLSX from "xlsx";
import type { ExportWorkRow } from "@/lib/export/export-types";

const sheetName = "作品运营建议";

export function buildWorksExportWorkbook(rows: ExportWorkRow[]): Buffer {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);

  worksheet["!cols"] = Object.keys(rows[0] ?? {}).map((key) => ({
    wch: Math.min(Math.max(key.length + 4, 14), 42),
  }));

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  return XLSX.write(workbook, {
    bookType: "xlsx",
    type: "buffer",
  }) as Buffer;
}
