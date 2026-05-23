# 书名和简介优化 API

更新时间：2026-05-24

## POST /api/works/[id]/title-intro

用于为指定作品运行书名和简介优化 Mock 生成流程。

当前流程会读取作品基础信息、最近一次作品识别结果和最近一次价值评级结果，构造 `TitleIntroGenerationInput`，调用规则引擎 `generateTitleIntroSuggestions(input)`，并将生成结果保存到 `WorkTitleIntroGeneration`。

成功时返回：

```json
{
  "success": true,
  "data": {
    "generationId": "...",
    "shouldGenerateVariants": true,
    "strategy": "rename_test",
    "strategyReason": "...",
    "titleVariants": [],
    "introVariant": {},
    "coverPrompts": [],
    "risks": [],
    "evidence": []
  }
}
```

如果作品不存在，返回 404 结构化错误。

## GET /api/works/[id]/title-intro

用于读取指定作品最近一次书名和简介优化结果。

如果没有生成结果，返回：

```json
{
  "success": true,
  "data": null
}
```

如果存在历史结果，API 会解析保存的 JSON 字段并返回结构化数据。历史 JSON 解析失败时不会导致 API 崩溃，会返回空数组或空对象，并在 `risks` 中加入“历史生成结果解析失败”相关提示。

## 当前限制

- 当前生成来自 Mock 规则引擎，不是 OpenAI。
- 没有评级结果时也可以生成，但会使用更保守的默认评级和策略。
- 当前只生成书名建议、简介建议和封面 prompt，不生成图片。
- 7D 会接入作品详情页展示。
- 后续阶段才会接入 OpenAI 文本生成。
