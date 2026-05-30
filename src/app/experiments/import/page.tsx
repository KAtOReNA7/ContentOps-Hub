import Link from "next/link";
import { ExperimentImportClient } from "@/app/experiments/import/experiment-import-client";

export default function ExperimentImportPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link className="text-sm text-red-700 hover:text-red-900" href="/works">
          返回作品列表
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-stone-950">导入多书名测试结果</h1>
        <p className="mt-2 max-w-3xl text-stone-600">
          手动导入对照组和实验组数据，系统会按作品和实验名称生成本地规则复盘结论。导入不会自动覆盖最终采用结果。
        </p>
      </div>
      <ExperimentImportClient />
    </div>
  );
}
