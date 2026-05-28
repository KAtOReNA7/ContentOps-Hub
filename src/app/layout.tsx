import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

const navItems = [
  { href: "/", label: "运营看板" },
  { href: "/import", label: "作品导入" },
  { href: "/works", label: "作品列表" },
  { href: "/analysis", label: "批量任务结果" },
  { href: "/settings", label: "系统配置" },
];

export const metadata: Metadata = {
  title: "内容运营综合管理平台",
  description: "番茄畅畅听多书名运营辅助工具",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="min-h-screen bg-stone-50">
          <header className="border-b border-stone-200 bg-white">
            <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <Link href="/" className="group">
                <p className="text-lg font-semibold text-stone-950">内容运营综合管理平台</p>
                <p className="mt-0.5 text-xs text-stone-500">番茄畅畅听多书名运营辅助工具</p>
              </Link>
              <nav className="flex flex-wrap gap-2 text-sm text-stone-700">
                {navItems.map((item) => (
                  <Link
                    className="rounded-md px-3 py-2 hover:bg-stone-100 hover:text-stone-950"
                    href={item.href}
                    key={item.href}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-7xl px-5 py-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
