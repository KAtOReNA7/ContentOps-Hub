import { evaluateWorkRating } from "@/lib/rating/rating-engine";
import type { RatingInput } from "@/lib/rating/rating-types";

export const ratingExamples: RatingInput[] = [
  {
    work: {
      id: "example-s",
      title: "重生后我在侯府翻身",
      author: "青枝",
      intro: "女主重回命运转折点，避开旧局，在家宅与朝堂之间重新夺回主动权。",
      category: "女频爽文",
      coverFileName: "example-s.jpg",
      remark: "强情绪开场",
      playCount: 180000,
      clickRate: 0.14,
      completionRate: 0.38,
    },
    identification: {
      confidence: 92,
      confirmed: true,
      finalMatch: { title: "重生后我在侯府翻身", author: "青枝" },
      candidates: [],
      risks: [],
      reason: "书名、作者、简介均高度匹配",
      evidence: [],
      sourceSummary: {
        audioPlatformCount: 1,
        ebookPlatformCount: 0,
        searchEngineCount: 0,
        socialMediaCount: 0,
        unknownCount: 0,
        authorMatchCount: 1,
      },
    },
  },
  {
    work: {
      id: "example-b",
      title: "离婚后前夫天天求复合",
      author: "山月",
      intro: "都市情感复合线，围绕误会、成长和事业逆袭展开。",
      category: "都市情感",
      coverFileName: "example-b.jpg",
      remark: "复合线明确",
      playCount: 42000,
      clickRate: 0.08,
      completionRate: 0.24,
    },
    identification: {
      confidence: 78,
      confirmed: false,
      finalMatch: { title: "离婚后前夫天天求复合", author: "山月" },
      candidates: [],
      risks: [],
      reason: "中高置信匹配",
      evidence: [],
      sourceSummary: {
        audioPlatformCount: 1,
        ebookPlatformCount: 1,
        searchEngineCount: 0,
        socialMediaCount: 0,
        unknownCount: 0,
        authorMatchCount: 1,
      },
    },
  },
  {
    work: {
      id: "example-d",
      title: "春日旧事",
      author: null,
      intro: "一段旧事。",
      category: null,
      coverFileName: null,
      remark: null,
      playCount: null,
      clickRate: null,
      completionRate: null,
    },
    identification: {
      confidence: 21,
      confirmed: false,
      finalMatch: null,
      candidates: [],
      risks: ["疑似重名，需要人工确认"],
      reason: "识别置信度很低",
      evidence: [],
      sourceSummary: null,
    },
  },
];

export const ratingExampleResults = ratingExamples.map((example) => evaluateWorkRating(example));
