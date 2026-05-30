const fs = require("node:fs");
const path = require("node:path");
const XLSX = require("xlsx");

const rows = [
  {
    实验名称: "2026年6月第一批多书名测试", "作品 ID": "FT-10001", 书名: "黑暗生存游戏", 作者: "曹操不迟到", 组别: "对照组", 实验组名称: "", 测试书名: "黑暗生存游戏", 测试简介: "", 封面地址: "", 曝光量: 10000, 点击量: 700, 点击率: "7%", 播放量: 2600, 转化量: 350, 转化率: "13.5%", 完播率: "30%", 收入: 980.5, 测试开始日期: "2026-06-01", 测试结束日期: "2026-06-07", 备注: "原始版本",
  },
  {
    实验名称: "2026年6月第一批多书名测试", "作品 ID": "FT-10001", 书名: "黑暗生存游戏", 作者: "曹操不迟到", 组别: "实验组", 实验组名称: "强冲突标题版", 测试书名: "规则降临：活到最后的人才能离开", 测试简介: "", 封面地址: "https://example.com/cover.jpg", 曝光量: 10000, 点击量: 920, 点击率: "9.2%", 播放量: 3400, 转化量: 510, 转化率: "15%", 完播率: "33%", 收入: 1360.8, 测试开始日期: "2026-06-01", 测试结束日期: "2026-06-07", 备注: "强化悬念标题",
  },
];

fs.mkdirSync(path.join(process.cwd(), "sample"), { recursive: true });
const worksheet = XLSX.utils.json_to_sheet(rows);
worksheet["!cols"] = Object.keys(rows[0]).map(() => ({ wch: 20 }));
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "多书名测试结果");
XLSX.writeFile(workbook, path.join(process.cwd(), "sample", "experiment-results-template.xlsx"));
