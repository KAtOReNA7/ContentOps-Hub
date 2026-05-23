import Link from "next/link";
import { getBatchAnalysisResults } from "@/lib/services/analysis-service";

export default async function AnalysisPage() {
  const results = await getBatchAnalysisResults();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-950">分析结果</h1>
        <p className="mt-2 text-stone-600">
          批量任务采用单条隔离策略，单个作品失败不会阻断整体结果展示。
        </p>
      </div>

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
                  <td className="px-4 py-3 text-stone-600">{result.ok ? "成功" : "失败"}</td>
                  <td className="px-4 py-3 text-stone-600">{result.ok ? result.data.score : "-"}</td>
                  <td className="px-4 py-3 text-stone-600">{result.ok ? result.data.grade : "-"}</td>
                  <td className="px-4 py-3 text-stone-600">
                    {result.ok ? result.data.summary : result.error}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
