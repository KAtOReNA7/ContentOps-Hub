export const reviewStatusLabels: Record<string, string> = {
  adopted: "已采用",
  approved: "已采用",
  needs_revision: "需修改",
  on_hold: "暂缓",
  paused: "暂缓",
  pending: "待处理",
  pending_review: "待审核",
  rejected: "已退回",
};

export const providerLabels: Record<string, string> = {
  configured: "真实搜索",
  custom: "自定义",
  mock: "Mock 规则引擎",
  openai: "OpenAI 文本生成",
  real: "真实搜索",
};

export const renameSuggestionLabels: Record<string, string> = {
  avoid: "不建议改名",
  cautious: "谨慎测试",
  recommended: "建议测试",
  strongly_recommended: "强烈建议测试",
};

export const coverStrategyLabels: Record<string, string> = {
  change_title: "换标题",
  keep_and_optimize_layout: "保留主体，优化标题区和版式",
  keep_and_replace_title: "换标题",
  keep_original: "保留原封面",
  optimize_layout: "优化版式",
  redraw: "重绘",
  redraw_cover: "重绘",
};

export const batchStatusLabels: Record<string, string> = {
  canceled: "已取消",
  failed: "失败",
  partial_success: "部分成功",
  pending: "待执行",
  running: "运行中",
  skipped: "已跳过",
  success: "成功",
};

export function displayLabel(map: Record<string, string>, value: string | null | undefined, empty = "未设置") {
  return value ? map[value] ?? value : empty;
}

