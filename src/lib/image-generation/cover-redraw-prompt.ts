import type { CoverRenderRatio } from "@/lib/cover-render/cover-render-types";
import type { CoverStrategy } from "@/lib/cover/cover-types";
import type { IntroVariantSuggestion, TitleVariantSuggestion } from "@/lib/generation/title-intro-types";

export type CoverRedrawPromptInput = {
  ratio: CoverRenderRatio;
  titleText: string;
  work: {
    title: string;
    author: string | null;
    description: string;
    category: string | null;
  };
  rating: {
    rating: string;
    score: number;
    renameSuggestion: string;
    renameReason: string;
  } | null;
  titleVariants: TitleVariantSuggestion[];
  introVariant: IntroVariantSuggestion | null;
  coverEvaluation: {
    strategy: CoverStrategy;
    reason: string;
    weaknesses: string[];
  } | null;
};

export function buildCoverRedrawPrompt(input: CoverRedrawPromptInput): string {
  const ratioInstruction =
    input.ratio === "1:1"
      ? "Output a square 1:1 audiobook cover composition. Keep the title readable in thumbnail size."
      : "Output a vertical 3:4 audiobook cover composition. Keep the top title area clean and readable.";
  const selectedVariant = input.titleVariants.find((variant) => variant.title === input.titleText);
  const sellingPoint = selectedVariant?.sellingPoint || input.introVariant?.styleTag || "人物困境、冲突升级和命运转折";
  const weaknessText = input.coverEvaluation?.weaknesses.length
    ? input.coverEvaluation.weaknesses.join("；")
    : "No prior cover weaknesses are available; use a conservative commercial cover direction.";

  return [
    "Create a commercial Chinese audiobook / web novel operations cover for platform A/B testing.",
    ratioInstruction,
    "",
    `New cover title text: ${input.titleText}`,
    `Original title: ${input.work.title}`,
    `Author: ${input.work.author || "unknown"}`,
    `Genre/category: ${input.work.category || "general Chinese web novel"}`,
    `Core selling point: ${sellingPoint}`,
    `Story summary: ${trimForPrompt(input.work.description, 520)}`,
    input.introVariant?.intro ? `Optimized intro direction: ${trimForPrompt(input.introVariant.intro, 260)}` : "",
    input.rating
      ? `Operational rating: ${input.rating.rating}, score ${input.rating.score}. Rename advice: ${input.rating.renameSuggestion}. ${input.rating.renameReason}`
      : "Operational rating is missing; keep the visual direction broadly appealing and conservative.",
    `Previous cover weaknesses to fix: ${weaknessText}`,
    input.coverEvaluation?.reason ? `Cover strategy reason: ${input.coverEvaluation.reason}` : "",
    "",
    "Visual requirements:",
    "- Strong commercial hook, clear genre atmosphere, readable title area, and one focused main visual.",
    "- Leave a clean title block with enough contrast; avoid clutter behind the text area.",
    "- Use cinematic lighting and platform-friendly composition suitable for audiobook thumbnails.",
    "- Do not imitate any living artist or named artist style.",
    "- Do not use celebrities, real public figures, unauthorized IP, copyrighted characters, logos, or platform names.",
    "- Avoid sexualized, hateful, illegal, graphic, bloody, or shocking imagery.",
    "- The result should feel like an operational test cover, not a pure art poster.",
  ]
    .filter(Boolean)
    .join("\n");
}

function trimForPrompt(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}...`;
}

