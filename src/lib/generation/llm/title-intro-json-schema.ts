export const titleIntroGenerationJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "shouldGenerateVariants",
    "strategy",
    "strategyReason",
    "titleVariants",
    "introVariant",
    "coverPrompts",
    "risks",
    "evidence",
  ],
  properties: {
    shouldGenerateVariants: {
      type: "boolean",
    },
    strategy: {
      type: "string",
      enum: ["keep_original", "minor_optimization", "rename_test", "heavy_repackage"],
    },
    strategyReason: {
      type: "string",
    },
    titleVariants: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "sellingPoint", "targetAudience", "reason", "risk", "styleTag"],
        properties: {
          title: {
            type: "string",
          },
          sellingPoint: {
            type: "string",
          },
          targetAudience: {
            type: "string",
          },
          reason: {
            type: "string",
          },
          risk: {
            type: "string",
          },
          styleTag: {
            type: "string",
          },
        },
      },
    },
    introVariant: {
      type: "object",
      additionalProperties: false,
      required: ["intro", "reason", "styleTag", "risk"],
      properties: {
        intro: {
          type: "string",
        },
        reason: {
          type: "string",
        },
        styleTag: {
          type: "string",
        },
        risk: {
          type: "string",
        },
      },
    },
    coverPrompts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["ratio", "prompt", "reason", "risk"],
        properties: {
          ratio: {
            type: "string",
            enum: ["1:1", "3:4"],
          },
          prompt: {
            type: "string",
          },
          reason: {
            type: "string",
          },
          risk: {
            type: "string",
          },
        },
      },
    },
    risks: {
      type: "array",
      items: {
        type: "string",
      },
    },
    evidence: {
      type: "array",
      items: {
        type: "string",
      },
    },
  },
} as const;
