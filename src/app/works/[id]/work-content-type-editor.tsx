"use client";
import { useState } from "react";
import { contentTypeLabel } from "@/lib/evidence/source-taxonomy";
export function WorkContentTypeEditor({ initialValue, workId }: { initialValue: string; workId: string }) {
  const [value, setValue] = useState(initialValue);
  const [message, setMessage] = useState("");
  async function save() {
    const response = await fetch(`/api/works/${workId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contentType: value }) });
    const payload = await response.json();
    setMessage(response.ok && payload.success ? "已保存" : payload.message || "保存失败");
  }
  return <div className="rounded-lg border border-stone-200 bg-white p-5"><p className="text-sm text-stone-500">作品类型</p><div className="mt-2 flex gap-2"><select className="min-w-0 flex-1 rounded-md border border-stone-300 px-3 py-2 text-sm" onChange={(event) => setValue(event.target.value)} value={value}><option value="web_novel">网文</option><option value="ebook">出版电子书</option><option value="audiobook">有声小说</option><option value="audio_drama">广播剧</option></select><button className="rounded-md border border-blue-200 bg-blue-50 px-3 text-sm text-blue-700" onClick={() => void save()} type="button">保存</button></div><p className="mt-2 text-xs text-stone-500">当前：{contentTypeLabel(value)}{message ? ` · ${message}` : ""}</p></div>;
}
