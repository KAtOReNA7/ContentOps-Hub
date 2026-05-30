import type { Metadata } from "next";
import { AppShell } from "@/components/ui/app-shell";
import "./globals.css";

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
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
