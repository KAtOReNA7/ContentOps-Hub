import Link from "next/link";
import { uiTokens } from "@/lib/ui/design-tokens";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: React.ReactNode }) {
  return <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div>{eyebrow ? <p className="text-xs font-semibold uppercase text-blue-700">{eyebrow}</p> : null}<h1 className="mt-1 text-2xl font-semibold text-slate-950 md:text-3xl">{title}</h1>{description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p> : null}</div>{actions}</div>;
}

export function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`${uiTokens.card} ${uiTokens.panelPadding} ${className}`}>{children}</section>;
}

export function StatCard({ label, value, hint, highlight = false }: { label: string; value: React.ReactNode; hint?: string; highlight?: boolean }) {
  return <div className={`${uiTokens.card} p-4 ${highlight ? "border-amber-200 bg-amber-50/70" : ""}`}><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>{hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : null}</div>;
}

export function MetricBar({ label, value, total, tone = "blue" }: { label: string; value: number; total: number; tone?: "blue" | "green" | "amber" | "red" | "purple" | "slate" }) {
  const colors = { amber: "bg-amber-500", blue: "bg-blue-500", green: "bg-emerald-500", purple: "bg-purple-500", red: "bg-red-500", slate: "bg-slate-400" };
  return <div className="grid grid-cols-[88px_minmax(60px,1fr)_32px] items-center gap-3 text-xs"><span className="font-medium text-slate-600">{label}</span><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${colors[tone]}`} style={{ width: total ? `${Math.round((value / total) * 100)}%` : "0%" }} /></div><span className="text-right font-semibold tabular-nums text-slate-900">{value}</span></div>;
}

export function EmptyState({ title, description, href, action }: { title: string; description: string; href?: string; action?: string }) {
  return <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center"><p className="font-semibold text-slate-900">{title}</p><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">{description}</p>{href && action ? <Link className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700" href={href}>{action}</Link> : null}</div>;
}

export function ActionCard({ title, description, href }: { title: string; description: string; href: string }) {
  return <Link className={`${uiTokens.card} ${uiTokens.cardHover} group p-4`} href={href}><div className="flex items-center justify-between gap-3"><p className="font-semibold text-slate-950">{title}</p><span className="text-blue-600 transition group-hover:translate-x-0.5">→</span></div><p className="mt-2 text-sm leading-5 text-slate-500">{description}</p></Link>;
}

export function WorkflowStep({ index, title, description }: { index: number; title: string; description: string }) {
  return <div className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">{index}</span><div><p className="text-sm font-medium text-slate-900">{title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p></div></div>;
}

export function ProgressBar({ value, tone = "blue" }: { value: number; tone?: "blue" | "green" | "amber" | "red" }) {
  const colors = { amber: "bg-amber-500", blue: "bg-blue-500", green: "bg-emerald-500", red: "bg-red-500" };
  return <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${colors[tone]}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>;
}

export function PriorityBadge({ children, tone = "blue" }: { children: React.ReactNode; tone?: "blue" | "amber" | "red" }) {
  const colors = { amber: "border-amber-200 bg-amber-50 text-amber-700", blue: "border-blue-200 bg-blue-50 text-blue-700", red: "border-red-200 bg-red-50 text-red-700" };
  return <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${colors[tone]}`}>{children}</span>;
}

export function EvidenceTag({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600">{children}</span>;
}

export function DataPanel({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return <SectionCard><div className="mb-4"><h2 className="font-semibold text-slate-950">{title}</h2>{description ? <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}</div>{children}</SectionCard>;
}
