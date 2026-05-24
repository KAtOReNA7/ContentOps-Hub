# 书名和简介优化 API

更新时间：2026-05-24

## POST /api/works/[id]/title-intro

用于为指定作品运行书名、简介和封面 prompt 的生成流程，并保存到 `WorkTitleIntroGeneration`。

请求体可选。不传请求体或不传 `provider` 时，默认使用 `mock`：

```json
{
  "provider": "mock"
}
```

也可以显式请求 OpenAI：

```json
{
  "provider": "openai"
}
```

provider 规则：

- `mock`：调用现有 `generateTitleIntroSuggestions(input)`，保持默认业务链路。
- `openai`：调用 OpenAI 文本生成 Adapter，输出仍需兼容 `TitleIntroGenerationResult`。
- 其他值：返回 400 结构化错误。

作品详情页现在会在生成时显式传入 provider。默认选择仍是 `mock`，因此现有页面操作不会默认触发 OpenAI。OpenAI 调用失败只会影响本次 `provider=openai` 请求，不影响用户切回 Mock 规则引擎继续生成。

OpenAI provider 需要本地 `.env` 配置：

```env
OPENAI_API_KEY=""
OPENAI_TEXT_MODEL=""
```

成功返回：

```json
{
  "success": true,
  "data": {
    "generationId": "...",
    "provider": "mock",
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

失败返回：

```json
{
  "success": false,
  "message": "...",
  "errors": []
}
```

## GET /api/works/[id]/title-intro

用于读取指定作品最近一次书名和简介优化结果。

GET 不需要 provider，保持原有逻辑。

如果没有生成结果，返回：

```json
{
  "success": true,
  "data": null
}
```

如果存在历史结果，API 会解析保存的 JSON 字段并返回结构化数据。历史 JSON 解析失败时不会导致 API 崩溃，会返回空数组或空对象，并在 `risks` 中追加解析失败说明。

## 当前限制

- 默认 provider 仍是 `mock`。
- `openai` 只在 POST 请求体明确传入 `{ "provider": "openai" }` 时调用。
- 当前只生成书名建议、简介建议和封面 prompt，不生成图片。
- 当前不接封面图片 API。
- 不要提交真实 API key。

## provider 请求体示例

使用 Mock：

```json
{
  "provider": "mock"
}
```

使用 OpenAI：

```json
{
  "provider": "openai"
}
```

不传 provider 或请求体为空时，默认等同于：

```json
{
  "provider": "mock"
}
```

## OpenAI provider 错误

当 `provider=openai` 时，API 会先检查服务端环境变量：

- `OPENAI_API_KEY`
- `OPENAI_TEXT_MODEL`

如果缺失、OpenAI 调用失败、OpenAI 输出结构校验失败，接口会返回结构化错误：

```json
{
  "success": false,
  "message": "...",
  "errors": []
}
```

错误返回不会包含真实 API key。OpenAI 失败只影响本次请求，用户仍可切回 `mock` 继续生成。

## GET 接口

`GET /api/works/[id]/title-intro` 只读取最近一次生成结果，不需要 provider，也不会触发 Mock 或 OpenAI 生成。

## OpenAI timeout 说明

OpenAI provider 支持服务端环境变量：

```env
OPENAI_TIMEOUT_MS=90000
OPENAI_PROXY_URL=socks5h://127.0.0.1:10808
```

`OPENAI_PROXY_URL` 支持：

- `http://127.0.0.1:端口`
- `https://127.0.0.1:端口`
- `socks5://127.0.0.1:端口`
- `socks5h://127.0.0.1:端口`

timeout 时接口会返回 HTTP 504，结构如下：

```json
{
  "success": false,
  "message": "OpenAI request timed out.",
  "errors": [
    "OpenAI request timed out after 90000 ms.",
    "建议检查网络、代理、模型延迟，或换用更快模型。"
  ]
}
```

错误返回不会包含真实 API key。OpenAI 失败只影响本次请求，用户仍可切回 `mock` 继续生成。
