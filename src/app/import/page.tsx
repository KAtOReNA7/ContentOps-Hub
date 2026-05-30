import { ImportClient } from "@/app/import/import-client";
import { PageHeader, SectionCard, WorkflowStep } from "@/components/ui";

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Import workflow" title="作品导入" description="上传 Excel 或 CSV 后先预览并校验，确认后写入本地 SQLite 数据库。" />
      <SectionCard className="grid gap-4 md:grid-cols-4">
        <WorkflowStep index={1} title="下载模板" description="使用官方模板整理作品字段。" />
        <WorkflowStep index={2} title="上传文件" description="支持 Excel 和 CSV 文件。" />
        <WorkflowStep index={3} title="预览校验" description="逐行确认错误和重复数据。" />
        <WorkflowStep index={4} title="确认入库" description="只写入校验通过的作品。" />
      </SectionCard>
      <ImportClient />
    </div>
  );
}
