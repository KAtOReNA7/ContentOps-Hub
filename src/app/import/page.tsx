import { ImportClient } from "@/app/import/import-client";

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-950">作品导入</h1>
        <p className="mt-2 text-stone-600">
          上传 Excel/CSV 后先预览并校验，确认后写入本地 SQLite 数据库。
        </p>
      </div>
      <ImportClient />
    </div>
  );
}
