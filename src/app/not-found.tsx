import Link from "next/link";

export default function NotFound() {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-6">
      <h1 className="text-2xl font-semibold text-stone-950">未找到作品</h1>
      <p className="mt-2 text-stone-600">当前 mock 数据中没有对应记录。</p>
      <Link className="mt-4 inline-block text-red-700 hover:text-red-900" href="/works">
        返回作品列表
      </Link>
    </div>
  );
}
