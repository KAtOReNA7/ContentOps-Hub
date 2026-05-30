"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "运营看板", short: "看" },
  { href: "/import", label: "作品导入", short: "导" },
  { href: "/works", label: "作品列表", short: "作" },
  { href: "/analysis", label: "批量任务", short: "批" },
  { href: "/experiments/import", label: "测试结果", short: "测" },
  { href: "/settings", label: "系统设置", short: "设" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <SidebarNav pathname={pathname} />

      <div className="lg:pl-60">
        <TopBar />
        <main className="mx-auto max-w-[1600px] px-4 py-6 md:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

export function SidebarNav({ pathname }: { pathname: string }) {
  return <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-slate-200/80 bg-white lg:block">
        <div className="border-b border-slate-100 px-5 py-5">
          <Link href="/">
            <p className="text-base font-semibold tracking-normal text-slate-950">ContentOps Hub</p>
            <p className="mt-1 text-xs text-slate-500">内容运营综合管理平台</p>
          </Link>
        </div>
        <nav className="space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active ? "bg-blue-50 text-blue-800" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                }`}
                href={item.href}
                key={item.href}
              >
                <span className={`flex h-7 w-7 items-center justify-center rounded-md text-xs ${active ? "bg-blue-100" : "bg-slate-100"}`}>{item.short}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute inset-x-3 bottom-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-500">
          <p className="font-medium text-slate-700">本地优先</p>
          <p>外部 API 仅在人工选择后调用。</p>
        </div>
      </aside>;
}

export function TopBar() {
  return <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur">
          <div className="flex min-h-16 items-center justify-between gap-4 px-4 md:px-6">
            <div>
              <p className="text-sm font-semibold text-slate-950">内容运营综合管理平台</p>
              <p className="text-xs text-slate-500">番茄畅听多书名运营辅助工具</p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700">本地数据库</span>
              <span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-blue-700">成本受控</span>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto border-t border-slate-100 px-3 py-2 lg:hidden">
            {navItems.map((item) => (
              <Link className="whitespace-nowrap rounded-md px-3 py-2 text-xs font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-800" href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </header>;
}
