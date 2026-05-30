const fs = require("node:fs");
const path = require("node:path");
const XLSX = require("xlsx");

const outputDir = path.join(process.cwd(), "sample");
const outputPath = path.join(outputDir, "input-template.xlsx");

const rows = [
  {
    "作品 ID": "FT-0001",
    书名: "重生后我在侯府翻身",
    作者: "青枝",
    分类: "女频爽文",
    简介: "女主重回命运转折点，避开旧局，在家宅与朝堂之间重新夺回主动权。",
    备注: "强情绪开场，适合多书名测试。",
    "封面文件 / 封面地址": "FT-0001.jpg",
    当前播放量: 120000,
    当前点击率: "12%",
    当前完播率: "38%",
  },
  {
    "作品 ID": "FT-0002",
    书名: "离婚后前夫天天求复合",
    作者: "山月",
    分类: "都市情感",
    简介: "都市情感复合线，围绕误会、成长和事业逆袭展开。",
    备注: "复合线明确，标题可强化反转。",
    "封面文件 / 封面地址": "https://example.com/covers/FT-0002.jpg",
    当前播放量: 86000,
    当前点击率: "0.09",
    当前完播率: "0.31",
  },
];

fs.mkdirSync(outputDir, { recursive: true });

const worksheet = XLSX.utils.json_to_sheet(rows);
worksheet["!cols"] = [
  { wch: 14 },
  { wch: 24 },
  { wch: 12 },
  { wch: 16 },
  { wch: 64 },
  { wch: 36 },
  { wch: 48 },
  { wch: 14 },
  { wch: 14 },
  { wch: 14 },
];

const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "作品导入模板");
XLSX.writeFile(workbook, outputPath);

console.log(`Created ${outputPath}`);
