import { generateTitleIntroSuggestions } from "@/lib/generation/title-intro-engine";
import type { TitleIntroGenerationInput } from "@/lib/generation/title-intro-types";

const baseIdentification: NonNullable<TitleIntroGenerationInput["identification"]> = {
  confidence: 86,
  finalMatch: { title: "重生后我改写命运", author: "示例作者" },
  candidates: [],
  risks: [],
  reason: "Mock 候选作品匹配度较高。",
};

const examples: TitleIntroGenerationInput[] = [
  {
    work: {
      id: "example-s",
      title: "重生后我改写命运",
      author: "示例作者",
      intro: "女主重生后回到命运转折点，避开上一世的背叛，夺回属于自己的事业与亲情。",
      category: "重生言情",
      coverFileName: "rebirth.jpg",
      remark: "平台已有较强认知。",
      playCount: 300000,
      clickRate: 0.15,
      completionRate: 0.42,
    },
    identification: baseIdentification,
    rating: {
      rating: "S",
      score: 88,
      confidence: 0.9,
      reasons: ["作品认知强", "数据表现好"],
      risks: [],
      evidence: ["识别置信度高"],
      renameSuggestion: "avoid",
      renameReason: "高认知作品不建议轻易改名。",
    },
  },
  {
    work: {
      id: "example-b",
      title: "离婚后她翻身了",
      author: "示例作者",
      intro: "被误解多年后，女主决定离开失败婚姻，凭借能力重回事业中心，也揭开旧日真相。",
      category: "都市言情",
      coverFileName: "city.jpg",
      remark: "标题有提升空间。",
      playCount: 50000,
      clickRate: 0.07,
      completionRate: 0.28,
    },
    identification: baseIdentification,
    rating: {
      rating: "B",
      score: 64,
      confidence: 0.76,
      reasons: ["题材可运营", "适合测试包装"],
      risks: ["标题冲突还可以更强"],
      evidence: ["有播放基础"],
      renameSuggestion: "recommended",
      renameReason: "适合多书名测试，强化冲突和身份反转。",
    },
  },
  {
    work: {
      id: "example-c",
      title: "小镇旧事",
      author: "示例作者",
      intro: "一场失踪案牵出多年秘密，主角在熟悉的小镇里重新寻找线索。",
      category: "悬疑",
      coverFileName: null,
      remark: "原包装偏平。",
      playCount: 12000,
      clickRate: 0.04,
      completionRate: 0.2,
    },
    identification: {
      ...baseIdentification,
      confidence: 72,
      risks: ["存在同名作品，需要人工确认。"],
    },
    rating: {
      rating: "C",
      score: 49,
      confidence: 0.62,
      reasons: ["悬疑题材有钩子"],
      risks: ["封面缺失", "标题吸引力弱"],
      evidence: ["简介有真相线索"],
      renameSuggestion: "strongly_recommended",
      renameReason: "包装问题明显，建议重提炼悬疑钩子。",
    },
  },
  {
    work: {
      id: "example-d",
      title: "",
      author: null,
      intro: "",
      category: null,
      coverFileName: null,
      remark: "信息不足。",
      playCount: null,
      clickRate: null,
      completionRate: null,
    },
    identification: null,
    rating: {
      rating: "D",
      score: 25,
      confidence: 0.25,
      reasons: [],
      risks: ["信息不足", "尚未识别"],
      evidence: ["缺少数据"],
      renameSuggestion: "cautious",
      renameReason: "投入产出不明，先补齐基础信息。",
    },
  },
];

export const titleIntroGenerationExamples = examples.map((example) => ({
  input: example,
  output: generateTitleIntroSuggestions(example),
}));
