# 阶段 16：真实搜索 API 适配层

更新时间：2026-05-29

## 目标

阶段 16 新增真实搜索 provider 适配层，用于辅助作品识别和证据保存。阶段 19.2 在单本作品识别和批量任务中补充显式入口。默认仍为 Mock-first，不接 OpenAI 视觉评分。

## 环境变量

```text
SEARCH_PROVIDER=mock
SEARCH_API_KEY=
SEARCH_BASE_URL=
SEARCH_TIMEOUT_MS=30000
SEARCH_MAX_RESULTS=10
SEARCH_EXPANDED_QUERY_LIMIT=1
SEARCH_QUERY_DELAY_MS=800
SEARCH_429_RETRY_COUNT=1
SEARCH_429_RETRY_DELAY_MS=1500
```

- `SEARCH_PROVIDER=mock`：默认模式，本地 Mock 搜索，不产生外部请求。
- `SEARCH_PROVIDER=real` 或 `custom`：调用 `SEARCH_BASE_URL`，并通过 `Authorization: Bearer <SEARCH_API_KEY>` 传递密钥。
- `SEARCH_API_KEY` 只在服务端读取，不在页面、日志或导出中展示。
- `SEARCH_BASE_URL` 在设置页只显示 host。
- `SEARCH_EXPANDED_QUERY_LIMIT`：单次识别最多执行的扩展 query 数，默认 `1`，避免触发搜索服务限流。需要更广覆盖时可调高到 `4`。
- `SEARCH_QUERY_DELAY_MS`：多个扩展 query 之间的等待时间，默认 `800` 毫秒。
- `SEARCH_429_RETRY_COUNT`：HTTP 429 限流时的重试次数，默认 `1`。
- `SEARCH_429_RETRY_DELAY_MS`：HTTP 429 重试前等待时间，默认 `1500` 毫秒。

## 查询策略

单本作品识别时生成一个搜索 query，包含：

- 书名
- 作者
- 业务作品 ID `externalId`
- 品类
- 简介关键词
- 有声书 / 畅听 / 听书 / 小说 / 原著等辅助关键词

不会在导入、导出或页面加载时自动触发真实搜索。阶段 19.2 仅在用户主动选择“真实搜索识别”并确认成本风险后，才会在单本识别或批量识别中调用已配置搜索服务。

## 页面选择模式

识别接口支持：

```json
{
  "searchProviderMode": "mock",
  "costRiskAccepted": false
}
```

或：

```json
{
  "searchProviderMode": "configured",
  "costRiskAccepted": true
}
```

- `mock`：强制使用本地 Mock。
- `configured`：读取 `.env.local` 中的搜索配置。选择此模式时必须确认成本风险。
- 如果环境仍为 `SEARCH_PROVIDER=mock`，页面提示本次未调用真实搜索。
- 如果真实搜索失败，允许回退 Mock，但页面明确标记为 `Mock fallback`。

## 统一结果结构

真实 provider 返回结果会归一化为：

- `title`
- `url`
- `snippet`
- `sourceName`
- `sourceType`
- `matchedTitle`
- `matchedAuthor`
- `confidenceHint`
- `riskHints`
- `rawRank`

`sourceType` 支持：

- `audio_platform`
- `ebook_platform`
- `search_engine`
- `social_media`
- `unknown`

## fallback

如果真实搜索配置缺失、超时或返回错误，识别接口不会让页面崩溃，而是回退到 Mock 搜索，并在识别证据和风险中记录真实搜索失败原因。

如果百度千帆返回 HTTP 429，通常表示请求限流或账号额度不足。系统默认只发送 1 个 query，并在 429 时进行短暂退避重试。如果重试后仍失败，页面会明确显示 Mock fallback。此时应检查百度千帆配额、调用频率和账号状态，不应把 fallback 结果作为正式识别依据。

识别结果区域会展示：

- 实际搜索 provider
- search query
- 原始、有效和过滤结果数量
- `baseURLHost`
- HTTP 状态
- 是否发生 fallback

页面不会展示 `SEARCH_API_KEY` 或完整敏感配置。

## 重要说明

搜索证据用于辅助识别，不等于自动定论。低置信度、作者不匹配、疑似重名或来源较弱时，仍需要运营人员人工确认后再作为正式评级依据。
