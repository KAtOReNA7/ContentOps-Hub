# 阶段 16：真实搜索 API 适配层

更新时间：2026-05-29

## 目标

阶段 16 新增真实搜索 provider 适配层，用于辅助作品识别和证据保存。默认仍为 Mock-first，不做批量搜索任务中心，不接 OpenAI 视觉评分。

## 环境变量

```text
SEARCH_PROVIDER=mock
SEARCH_API_KEY=
SEARCH_BASE_URL=
SEARCH_TIMEOUT_MS=30000
SEARCH_MAX_RESULTS=10
```

- `SEARCH_PROVIDER=mock`：默认模式，本地 Mock 搜索，不产生外部请求。
- `SEARCH_PROVIDER=real` 或 `custom`：调用 `SEARCH_BASE_URL`，并通过 `Authorization: Bearer <SEARCH_API_KEY>` 传递密钥。
- `SEARCH_API_KEY` 只在服务端读取，不在页面、日志或导出中展示。
- `SEARCH_BASE_URL` 在设置页只显示 host。

## 查询策略

单本作品识别时生成一个搜索 query，包含：

- 书名
- 作者
- 业务作品 ID `externalId`
- 品类
- 简介关键词
- 有声书 / 畅听 / 听书 / 小说 / 原著等辅助关键词

阶段 16 不做批量搜索，也不会在导入、导出或页面加载时自动触发真实搜索。

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

## 重要说明

搜索证据用于辅助识别，不等于自动定论。低置信度、作者不匹配、疑似重名或来源较弱时，仍需要运营人员人工确认后再作为正式评级依据。
