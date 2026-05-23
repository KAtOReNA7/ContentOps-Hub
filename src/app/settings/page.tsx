import { getSettings } from "@/lib/mock-data";

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-950">设置</h1>
        <p className="mt-2 text-stone-600">
          MVP 默认使用 mock adapter，不读取真实 API Key，不批量生成图片。
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        {settings.map((setting) => (
          <div className="rounded-lg border border-stone-200 bg-white p-5" key={setting.key}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-stone-950">{setting.label}</h2>
                <p className="mt-2 text-sm text-stone-600">{setting.description}</p>
              </div>
              <span className="rounded-md bg-stone-100 px-3 py-1 text-sm text-stone-700">
                {setting.value}
              </span>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
