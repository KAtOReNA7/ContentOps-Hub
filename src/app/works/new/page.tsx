import Link from "next/link";
import { NewWorkForm } from "@/app/works/new/new-work-form";

export default function NewWorkPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link className="text-sm text-red-700 hover:text-red-900" href="/works">
          返回作品列表
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-stone-950">手动新增作品</h1>
        <p className="mt-2 max-w-3xl text-stone-600">
          不依赖 Excel，也可以直接录入单本作品。创建后会进入作品详情页，继续完成识别、评级、生成、封面处理和人工审核。
        </p>
      </div>
      <NewWorkForm />
    </div>
  );
}
