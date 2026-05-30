type BadgeTone = "stone" | "green" | "amber" | "orange" | "red" | "blue" | "purple";

type StatusBadgeProps = {
  children: React.ReactNode;
  tone?: BadgeTone;
  title?: string;
};

const toneClasses: Record<BadgeTone, string> = {
  amber: "bg-amber-100 text-amber-800 ring-amber-200",
  blue: "bg-blue-100 text-blue-800 ring-blue-200",
  green: "bg-green-100 text-green-800 ring-green-200",
  orange: "bg-orange-100 text-orange-800 ring-orange-200",
  purple: "bg-purple-100 text-purple-800 ring-purple-200",
  red: "bg-red-100 text-red-800 ring-red-200",
  stone: "bg-stone-100 text-stone-700 ring-stone-200",
};

export function StatusBadge({ children, title, tone = "stone" }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${toneClasses[tone]}`}
      title={title}
    >
      <span className="truncate">{children}</span>
    </span>
  );
}

export function ratingTone(rating: string | null | undefined): BadgeTone {
  if (rating === "S") return "purple";
  if (rating === "A") return "green";
  if (rating === "B") return "blue";
  if (rating === "C") return "amber";
  if (rating === "D") return "red";
  return "stone";
}

export function reviewStatusLabel(value: string | null | undefined): string {
  return displayLabel(reviewStatusLabels, value);
}

export function reviewStatusTone(value: string | null | undefined): BadgeTone {
  if (value === "approved") return "green";
  if (value === "rejected") return "red";
  if (value === "needs_revision") return "orange";
  if (value === "on_hold") return "amber";
  return "stone";
}

export function coverStrategyLabel(value: string | null | undefined): string {
  return displayLabel(coverStrategyLabels, value, "未评估");
}

export function coverStrategyTone(value: string | null | undefined): BadgeTone {
  if (value === "keep_and_replace_title") return "green";
  if (value === "keep_and_optimize_layout") return "blue";
  if (value === "redraw_cover") return "red";
  return "stone";
}

export function workStatusLabel(value: string | null | undefined): string {
  return ({ analyzed: "已分析", failed: "失败", imported: "已导入" } as Record<string, string>)[value || ""] ?? value ?? "未设置";
}

export function renameSuggestionLabel(value: string | null | undefined): string {
  return displayLabel(renameSuggestionLabels, value, "未生成");
}

export function generationStrategyLabel(value: string | null | undefined): string {
  return ({ keep_original: "保留原名", minor_optimization: "轻度优化", rename_test: "多书名测试", heavy_repackage: "重包装" } as Record<string, string>)[value || ""] ?? value ?? "未生成";
}

export function providerLabel(value: string | null | undefined): string {
  return displayLabel(providerLabels, value);
}

export function experimentRecommendationLabel(value: string | null | undefined): string {
  return ({ adopt: "建议采用", continue_test: "继续测试", need_more_data: "数据不足", rollback: "建议回退" } as Record<string, string>)[value || ""] ?? value ?? "未复盘";
}

export function batchStatusLabel(value: string | null | undefined): string {
  return displayLabel(batchStatusLabels, value);
}

export function batchStatusTone(value: string | null | undefined): BadgeTone {
  if (value === "success") return "green";
  if (value === "running") return "blue";
  if (value === "partial_success") return "orange";
  if (value === "failed") return "red";
  return "stone";
}
import { batchStatusLabels, coverStrategyLabels, displayLabel, providerLabels, renameSuggestionLabels, reviewStatusLabels } from "@/lib/ui/display-maps";
