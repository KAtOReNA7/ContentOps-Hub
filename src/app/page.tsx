import Link from "next/link";
import { getDashboardStats } from "@/lib/mock-data";

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-stone-200 bg-white p-6">
        <p className="text-sm font-medium text-red-700">MVP Mock Mode</p>
        <h1 className="mt-2 text-3xl font-semibold text-stone-950">
          多书名运营分析工作台
        </h1>
        <p className="mt-3 max-w-3xl text-stone-600">
          当前版本使用本地 mock 数据跑通作品导入、识别、评级、书名简介生成和分析结果展示流程，不连接真实搜索或 OpenAI API。
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {stats.cards.map((card) => (
          <div className="rounded-lg border border-stone-200 bg-white p-5" key={card.label}>
            <p className="text-sm text-stone-500">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-stone-950">{card.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {stats.quickActions.map((action) => (
          <Link
            className="rounded-lg border border-stone-200 bg-white p-5 transition hover:border-red-200 hover:bg-red-50"
            href={action.href}
            key={action.href}
          >
            <h2 className="font-semibold text-stone-950">{action.title}</h2>
            <p className="mt-2 text-sm text-stone-600">{action.description}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
