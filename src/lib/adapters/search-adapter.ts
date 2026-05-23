import type { Work } from "@/lib/schemas";

export type RecognitionResult = {
  category: string;
  marketTags: string[];
  similarTitlePattern: string;
};

export interface SearchAdapter {
  recognizeWork(work: Work): Promise<RecognitionResult>;
}

export const mockSearchAdapter: SearchAdapter = {
  async recognizeWork(work) {
    const isModern = work.title.includes("离婚") || work.description.includes("都市");

    return {
      category: isModern ? "都市情感" : "女频爽文",
      marketTags: isModern ? ["复合", "逆袭", "强情绪"] : ["重生", "逆袭", "强钩子"],
      similarTitlePattern: isModern ? "离婚后 + 反转关系 + 高情绪" : "身份反转 + 命运重启 + 爽点承诺",
    };
  },
};
