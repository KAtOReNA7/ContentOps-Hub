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
  const labels: Record<string, string> = {
    approved: "已采用",
    needs_revision: "需修改",
    on_hold: "暂缓",
    pending_review: "待审核",
    rejected: "已退回",
  };

  return value ? labels[value] ?? value : "未设置";
}

export function reviewStatusTone(value: string | null | undefined): BadgeTone {
  if (value === "approved") return "green";
  if (value === "rejected") return "red";
  if (value === "needs_revision") return "orange";
  if (value === "on_hold") return "amber";
  return "stone";
}

export function coverStrategyLabel(value: string | null | undefined): string {
  const labels: Record<string, string> = {
    keep_and_optimize_layout: "优化版式",
    keep_and_replace_title: "换标题",
    redraw_cover: "重绘",
  };

  return value ? labels[value] ?? value : "未评估";
}

export function coverStrategyTone(value: string | null | undefined): BadgeTone {
  if (value === "keep_and_replace_title") return "green";
  if (value === "keep_and_optimize_layout") return "blue";
  if (value === "redraw_cover") return "red";
  return "stone";
}
