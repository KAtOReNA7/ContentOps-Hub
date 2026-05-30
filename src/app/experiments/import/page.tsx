import Link from "next/link";
import { ExperimentImportClient } from "@/app/experiments/import/experiment-import-client";
import { PageHeader, SectionCard, WorkflowStep } from "@/components/ui";

export default function ExperimentImportPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link className="text-sm text-red-700 hover:text-red-900" href="/works">
          返回作品列表
        </Link>
        <div className="mt-3"><PageHeader eyebrow="Experiment workflow" title="导入多书名测试结果" description="手动导入对照组和实验组数据，系统会按作品和实验名称生成本地规则复盘结论。导入不会自动覆盖最终采用结果。" /></div>
      </div>
      <SectionCard className="grid gap-4 md:grid-cols-4">
        <WorkflowStep active index={1} title="下载模板" description="按实验组填写测试指标。" />
        <WorkflowStep index={2} title="上传结果" description="上传 Excel 或 CSV 文件。" />
        <WorkflowStep index={3} title="检查校验" description="确认作品匹配和组别完整性。" />
        <WorkflowStep index={4} title="生成复盘" description="导入后查看结论与效果洞察。" />
      </SectionCard>
      <ExperimentImportClient />
    </div>
  );
}
