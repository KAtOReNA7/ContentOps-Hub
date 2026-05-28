import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { getBatchAnalysisResults } from "@/lib/services/analysis-service";

export default async function AnalysisPage() {
  const results = await getBatchAnalysisResults();

  return (
    <div className="space-y-6">
      <div>
        <StatusBadge tone="amber">过渡页面</StatusBadge>
        <h1 className="mt-3 text-2xl font-semibold text-stone-950">批量任务结果中心</h1>
        <p className="mt-2 max-w-3xl text-stone-600">
          当前页面是批量分析、批量生成和批量导出的预留入口。正式分析流程请进入作品列表和作品详情页完成识别、评级、生成、封面处理和人工审核。
        </p>
      </div>

      <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        下方内容为 Mock 演示数据，仅用于展示批量任务结果中心的未来形态，不代表真实生产分析结果。
      </section>

      <section className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-stone-50 text-stone-500">
              <tr>
                <th className="px-4 py-3">作品</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">评分</th>
                <th className="px-4 py-3">评级</th>
                <th className="px-4 py-3">摘要</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => (
                <tr className="border-t border-stone-100" key={result.work.id}>
                  <td className="px-4 py-3">
                    <Link className="font-medium text-stone-950 hover:text-red-800" href={`/works/${result.work.id}`}>
                      {result.work.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-stone-600">{result.ok ? "Mock 成功" : "Mock 失败"}</td>
                  <td className="px-4 py-3 text-stone-600">{result.ok ? result.data.score : "-"}</td>
                  <td className="px-4 py-3 text-stone-600">{result.ok ? result.data.grade : "-"}</td>
                  <td className="px-4 py-3 text-stone-600">{result.ok ? result.data.summary : result.error}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
