import { WorkSchema, type Work } from "@/lib/schemas";

const works = WorkSchema.array().parse([
  {
    id: "work-001",
    title: "重生后我在侯府翻身",
    author: "青枝",
    description: "女主重回命运转折点，避开旧局，在家宅与朝堂之间重新夺回主动权。",
    status: "analyzed",
    statusLabel: "已分析",
  },
  {
    id: "work-002",
    title: "离婚后前夫天天求复合",
    author: "山月",
    description: "都市情感复合线，围绕误会、成长和事业逆袭展开。",
    status: "imported",
    statusLabel: "待分析",
  },
  {
    id: "work-003",
    title: "玄门小祖宗下山了",
    author: "云栖",
    description: "轻喜玄学题材，主角用反差人设解决委托并揭开身世线索。",
    status: "analyzed",
    statusLabel: "已分析",
  },
]);

export async function getWorks(): Promise<Work[]> {
  return works;
}

export async function getWorkById(id: string): Promise<Work | undefined> {
  return works.find((work) => work.id === id);
}

export async function mockImportPreview(): Promise<Work[]> {
  return works;
}

export async function getDashboardStats() {
  return {
    cards: [
      { label: "导入作品", value: works.length.toString() },
      { label: "已分析", value: works.filter((work) => work.status === "analyzed").length.toString() },
      { label: "待分析", value: works.filter((work) => work.status === "imported").length.toString() },
      { label: "失败任务", value: works.filter((work) => work.status === "failed").length.toString() },
    ],
    quickActions: [
      {
        href: "/import",
        title: "导入作品",
        description: "从样例数据开始验证 Excel/CSV 导入流程。",
      },
      {
        href: "/works",
        title: "查看作品",
        description: "检查作品基础信息与单本分析详情。",
      },
      {
        href: "/analysis",
        title: "批量结果",
        description: "查看 mock 批量分析的成功和失败隔离。",
      },
    ],
  };
}

export async function getSettings() {
  return [
    {
      key: "text-adapter",
      label: "文本分析 adapter",
      description: "当前固定为 mock adapter，后续再接 OpenAI 文本 API。",
      value: "mock",
    },
    {
      key: "image-batch",
      label: "批量图片生成",
      description: "默认关闭，避免 API 成本失控。",
      value: "关闭",
    },
    {
      key: "database",
      label: "本地数据库",
      description: "使用 SQLite + Prisma，本阶段页面先读取 mock 数据。",
      value: "SQLite",
    },
    {
      key: "network-policy",
      label: "网络失败策略",
      description: "外部服务失败需要降级，不允许导致整个应用崩溃。",
      value: "降级",
    },
  ];
}
