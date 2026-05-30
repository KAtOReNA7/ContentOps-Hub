"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", icon: "▦", label: "运营看板" },
  { href: "/import", icon: "⇩", label: "作品导入" },
  { href: "/works", icon: "▤", label: "作品列表" },
  { href: "/analysis", icon: "◫", label: "批量任务" },
  { href: "/experiments/import", icon: "⌁", label: "测试结果" },
  { href: "/settings", icon: "⚙", label: "系统设置" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <SidebarNav pathname={pathname} />
      <div className="lg:pl-60">
        <TopBar />
        <main className="mx-auto max-w-[1560px] px-4 py-6 md:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

export function SidebarNav({ pathname }: { pathname: string }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-slate-200/80 bg-white lg:block">
      <div className="border-b border-slate-100 px-5 py-5">
        <Link className="flex items-center gap-3" href="/">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-sm font-semibold text-white">C</span>
          <span>
            <span className="block text-base font-semibold text-slate-950">ContentOps Hub</span>
            <span className="mt-0.5 block text-xs text-slate-500">内容运营平台</span>
          </span>
        </Link>
      </div>
      <nav className="space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${active ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`} href={item.href} key={item.href}>
              <span className={`flex h-7 w-7 items-center justify-center rounded-md text-sm ${active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"}`}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="absolute inset-x-3 bottom-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-500">
        <p className="flex items-center gap-2 font-medium text-slate-700"><span className="h-2 w-2 rounded-full bg-emerald-500" />系统运行正常</p>
        <p className="mt-1">本地优先 · 成本受控</p>
      </div>
    </aside>
  );
}

export function TopBar() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="flex min-h-16 items-center justify-between gap-4 px-4 md:px-6">
        <div className="hidden min-w-[260px] max-w-md flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-400 md:flex">
          <span>⌕</span><span>搜索作品 / 作品 ID / 任务</span>
        </div>
        <div className="md:hidden">
          <p className="text-sm font-semibold text-slate-950">ContentOps Hub</p>
          <p className="text-xs text-slate-500">内容运营平台</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="hidden rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700 sm:inline-flex">● 本地优先</span>
          <span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-blue-700">成本受控</span>
          <span className="hidden border-l border-slate-200 pl-3 text-slate-600 sm:inline-flex">运营</span>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-t border-slate-100 px-3 py-2 lg:hidden">
        {navItems.map((item) => <Link className="whitespace-nowrap rounded-md px-3 py-2 text-xs font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-800" href={item.href} key={item.href}>{item.label}</Link>)}
      </nav>
    </header>
  );
}
