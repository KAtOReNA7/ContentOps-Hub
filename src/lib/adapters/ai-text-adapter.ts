import { AnalysisResultSchema, type AnalysisResult, type Work } from "@/lib/schemas";
import type { RecognitionResult } from "@/lib/adapters/search-adapter";

export interface AiTextAdapter {
  analyzeWork(work: Work, recognition: RecognitionResult): Promise<AnalysisResult>;
}

export const mockAiTextAdapter: AiTextAdapter = {
  async analyzeWork(work, recognition) {
    const score = work.status === "imported" ? 78 : 86;
    const grade = score >= 90 ? "S" : score >= 80 ? "A" : score >= 70 ? "B" : "C";

    return AnalysisResultSchema.parse({
      workId: work.id,
      score,
      grade,
      summary: `${work.title} 属于${recognition.category}，核心卖点集中在${recognition.marketTags.join("、")}。`,
      titleIdeas: [
        `${work.title}：她终于不忍了`,
        `${recognition.marketTags[0]}归来，命运重写`,
        `全网都在等她翻盘`,
      ],
      introIdeas: [
        `一次关键选择，让主角从被动承受转向主动破局，适合强化前三集情绪钩子。`,
        `可围绕${recognition.similarTitlePattern}设计多书名，突出冲突、身份和结果承诺。`,
      ],
      riskNotes: "当前为 mock 判断，正式上线前需要接入真实规则和人工复核。",
    });
  },
};
