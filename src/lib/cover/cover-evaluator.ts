import type { CoverAssetView, CoverEvaluationResult, CoverRating, CoverStrategy } from "@/lib/cover/cover-types";

type EvaluateCoverInput = {
  work: {
    title: string;
    category: string | null;
    coverFileName: string | null;
  };
  asset: Pick<CoverAssetView, "fileName" | "originalName" | "mimeType" | "sizeBytes" | "sourceType">;
};

export function evaluateCoverWithMock({ work, asset }: EvaluateCoverInput): CoverEvaluationResult {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  let score = 52;

  if (asset.sourceType === "remote_url") {
    strengths.push("封面来源为导入表格中的远程图片地址，可直接用于当前 MVP 预览和评估。");
    weaknesses.push("远程封面未在导入阶段下载或校验，仍需人工确认图片是否可访问且与作品匹配。");
  } else {
    strengths.push("封面来源为本地手动上传，文件已保存到本地 uploads 目录。");
  }

  if (asset.mimeType === "image/webp" || asset.mimeType === "image/png") {
    score += 10;
    strengths.push("图片格式适合网页预览和后续处理");
  } else if (asset.mimeType === "image/jpeg") {
    score += 6;
    strengths.push("图片格式通用，适合当前 MVP 使用");
  } else {
    score -= 20;
    weaknesses.push("图片格式不在推荐范围内");
  }

  if (asset.sourceType === "remote_url" && asset.sizeBytes <= 0) {
    strengths.push("远程封面暂不依赖文件体积评分，避免导入阶段阻塞式下载图片。");
  } else if (asset.sizeBytes >= 180_000 && asset.sizeBytes <= 2_500_000) {
    score += 14;
    strengths.push("文件体积处于较合理范围，推测清晰度可用");
  } else if (asset.sizeBytes < 80_000) {
    score -= 18;
    weaknesses.push("文件体积偏小，可能存在清晰度不足或压缩过度");
  } else if (asset.sizeBytes > 4_000_000) {
    score -= 8;
    weaknesses.push("文件体积偏大，后续列表加载和导出需要压缩");
  }

  const fileText = `${asset.fileName} ${asset.originalName} ${work.coverFileName ?? ""}`.toLowerCase();
  const titleTokens = Array.from(new Set(work.title.toLowerCase())).filter((token) => token.trim());
  const matchedTitleTokens = titleTokens.filter((token) => fileText.includes(token)).length;

  if (titleTokens.length > 0 && matchedTitleTokens / titleTokens.length > 0.25) {
    score += 8;
    strengths.push("封面文件名与作品名存在一定关联，资产归属风险较低");
  } else {
    weaknesses.push("封面文件名与作品名关联较弱，建议人工确认资产是否对应");
    score -= 4;
  }

  if (work.category) {
    strengths.push(`作品品类为 ${work.category}，后续可按品类优化标题区和版式`);
    score += 4;
  } else {
    weaknesses.push("作品品类缺失，封面风格判断偏保守");
    score -= 4;
  }

  const finalScore = clampScore(score);
  const rating = ratingFromScore(finalScore);
  const strategy = strategyFromRating(rating);

  return {
    score: finalScore,
    rating,
    strengths: strengths.length ? strengths : ["当前封面可作为后续人工审核的基础资产"],
    weaknesses: weaknesses.length ? weaknesses : ["未发现明显基础资产问题，仍需人工检查画面与标题区"],
    strategy,
    reason: strategyReason(strategy, rating),
  };
}

function ratingFromScore(score: number): CoverRating {
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 45) return "C";
  return "D";
}

function strategyFromRating(rating: CoverRating): CoverStrategy {
  if (rating === "A") return "keep_and_replace_title";
  if (rating === "B" || rating === "C") return "keep_and_optimize_layout";
  return "redraw_cover";
}

function strategyReason(strategy: CoverStrategy, rating: CoverRating): string {
  if (strategy === "keep_and_replace_title") {
    return `封面评级为 ${rating}，主体资产较可用，后续优先基于新书名替换封面标题。`;
  }

  if (strategy === "keep_and_optimize_layout") {
    return `封面评级为 ${rating}，建议保留主体画面，后续重点优化标题区、字号、对比度和版式。`;
  }

  return `封面评级为 ${rating}，当前资产质量或匹配度偏弱，后续可进入重新绘制封面的候选池。`;
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}
