"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type CreateWorkResponse =
  | {
      success: true;
      data: {
        workId: string;
      };
    }
  | {
      success: false;
      message: string;
      errors: string[];
    };

export function NewWorkForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch("/api/works", {
        body: formData,
        method: "POST",
      });
      const payload = (await response.json()) as CreateWorkResponse;

      if (!response.ok || !payload.success) {
        throw new Error(formatApiError(response.status, payload));
      }

      router.push(`/works/${payload.data.workId}`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "创建作品失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="grid gap-5 rounded-lg border border-stone-200 bg-white p-5" onSubmit={submit}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="书名" name="title" placeholder="请输入作品原书名" required />
        <Field
          helpText="用于对应平台后台、Excel 清单或 CP 侧作品编号，不是系统内部 ID。"
          label="作品 ID"
          name="externalId"
          placeholder="选填，如平台后台作品编号"
        />
        <Field label="作者" name="author" placeholder="可选" />
        <Field label="分类" name="category" placeholder="如：都市、悬疑、言情" />
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-stone-700">作品类型 <span className="text-red-700">*</span></span>
          <select className="rounded-md border border-stone-300 px-3 py-2" defaultValue="web_novel" name="contentType" required>
            <option value="web_novel">网文</option><option value="ebook">出版电子书</option><option value="audiobook">有声小说</option><option value="audio_drama">广播剧</option>
          </select>
        </label>
        <Field label="当前播放量" name="currentPlays" placeholder="非负整数，如 12000" />
        <Field label="当前点击率" name="currentCtr" placeholder="支持 0.12 或 12%" />
        <Field label="当前完播率" name="currentFinish" placeholder="支持 0.35 或 35%" />
      </div>

      <label className="grid gap-2 text-sm">
        <span className="font-medium text-stone-700">简介</span>
        <textarea className="min-h-32 rounded-md border border-stone-300 px-3 py-2" name="description" placeholder="可选，建议填写作品原简介" />
      </label>

      <label className="grid gap-2 text-sm">
        <span className="font-medium text-stone-700">备注</span>
        <textarea className="min-h-24 rounded-md border border-stone-300 px-3 py-2" name="notes" placeholder="可选。备注会进入书名/简介/封面 prompt 生成上下文，但不参与价值评级打分。" />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="封面 URL" name="coverUrl" placeholder="http:// 或 https://，可选" />
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-stone-700">本地上传封面</span>
          <input accept="image/jpeg,image/png,image/webp" className="rounded-md border border-stone-300 px-3 py-2" name="coverFile" type="file" />
        </label>
      </div>

      <div className="rounded-md bg-stone-50 p-3 text-sm text-stone-600">
        封面 URL 和本地上传可二选一；如果都填写，会同时创建远程封面资产和本地上传封面资产，详情页默认展示最新封面。
      </div>

      {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="flex gap-3">
        <button className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:bg-stone-300" disabled={isSubmitting} type="submit">
          {isSubmitting ? "创建中..." : "创建作品"}
        </button>
        <button className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-800" onClick={() => router.push("/works")} type="button">
          取消
        </button>
      </div>
    </form>
  );
}

function Field({
  helpText,
  label,
  name,
  placeholder,
  required = false,
}: {
  helpText?: string;
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-medium text-stone-700">
        {label}
        {required ? <span className="text-red-700"> *</span> : null}
      </span>
      <input className="rounded-md border border-stone-300 px-3 py-2" name={name} placeholder={placeholder} required={required} />
      {helpText ? <span className="text-xs leading-5 text-stone-500">{helpText}</span> : null}
    </label>
  );
}

function formatApiError(status: number, payload: CreateWorkResponse): string {
  if (payload.success) {
    return `HTTP ${status}`;
  }

  return [`HTTP ${status}`, payload.message, payload.errors.join("；")].filter(Boolean).join(" | ");
}
