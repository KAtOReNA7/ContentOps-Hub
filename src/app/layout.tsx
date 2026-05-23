import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/import", label: "作品导入" },
  { href: "/works", label: "作品列表" },
  { href: "/analysis", label: "分析结果" },
  { href: "/settings", label: "设置" },
];

export const metadata: Metadata = {
  title: "番茄畅畅听多书名运营辅助工具",
  description: "面向有声书运营的多书名分析 MVP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="min-h-screen">
          <header className="border-b border-stone-200 bg-white">
            <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <Link href="/" className="text-lg font-semibold text-stone-950">
                番茄畅畅听运营辅助
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
          <main className="mx-auto max-w-6xl px-5 py-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
