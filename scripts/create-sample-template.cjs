const fs = require("node:fs");
const path = require("node:path");
const XLSX = require("xlsx");

const outputDir = path.join(process.cwd(), "sample");
const outputPath = path.join(outputDir, "input-template.xlsx");

const rows = [
  {
    作品ID: "FT-0001",
    原书名: "重生后我在侯府翻身",
    作者名: "青枝",
    原简介: "女主重回命运转折点，避开旧局，在家宅与朝堂之间重新夺回主动权。",
    封面文件名: "FT-0001.jpg",
    品类: "女频爽文",
    当前播放量: 120000,
    当前点击率: "12%",
    当前完播率: "38%",
    备注: "强情绪开场，适合多书名测试",
  },
  {
    作品ID: "FT-0002",
    原书名: "离婚后前夫天天求复合",
    作者名: "山月",
    原简介: "都市情感复合线，围绕误会、成长和事业逆袭展开。",
    封面文件名: "FT-0002.jpg",
    品类: "都市情感",
    当前播放量: 86000,
    当前点击率: "0.09",
    当前完播率: "0.31",
    备注: "复合线明确，标题可强化反转",
  },
];

fs.mkdirSync(outputDir, { recursive: true });

const worksheet = XLSX.utils.json_to_sheet(rows);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "导入模板");
XLSX.writeFile(workbook, outputPath);

console.log(`Created ${outputPath}`);
