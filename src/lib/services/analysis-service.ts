import { mockAiTextAdapter } from "@/lib/adapters/ai-text-adapter";
import { mockSearchAdapter } from "@/lib/adapters/search-adapter";
import { getWorks } from "@/lib/mock-data";
import type { AnalysisResult, Work } from "@/lib/schemas";

export type BatchAnalysisItem =
  | { ok: true; work: Work; data: AnalysisResult }
  | { ok: false; work: Work; error: string };

export async function analyzeWorkWithMocks(work: Work): Promise<AnalysisResult> {
  const recognition = await mockSearchAdapter.recognizeWork(work);
  return mockAiTextAdapter.analyzeWork(work, recognition);
}

export async function getBatchAnalysisResults(): Promise<BatchAnalysisItem[]> {
  const works = await getWorks();

  return Promise.all(
    works.map(async (work) => {
      try {
        const data = await analyzeWorkWithMocks(work);
        return { ok: true, work, data } satisfies BatchAnalysisItem;
      } catch (error) {
        return {
          ok: false,
          work,
          error: error instanceof Error ? error.message : "未知分析失败",
        } satisfies BatchAnalysisItem;
      }
    }),
  );
}
