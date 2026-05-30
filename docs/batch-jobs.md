# 批量任务中心 V1

阶段 17 新增批量任务中心，用于对选中的作品顺序执行常见运营分析步骤。阶段 17.1 补充了书名简介生成 provider 选择和列表密度优化。

## 支持的批量步骤

- 作品识别：`identify`
- 作品价值评级：`rating`
- 书名简介生成：`title_intro`
- 封面评估：`cover_evaluation`

阶段 17 V1 不引入 Redis、BullMQ、后台 worker 或消息队列。任务创建后在本地顺序执行，并保存每条任务项的状态。

## 单条失败不影响整体

每个 `BatchJobItem` 独立执行并独立记录：

- `success`
- `failed`
- `skipped`
- `errorCode`
- `errorMessage`
- `resultSummaryJson`

如果同一个批量任务中既有成功项又有失败项，`BatchJob.status` 会变为 `partial_success`。

## 成本确认机制

以下场景必须传入 `costRiskAccepted=true`：

- `SEARCH_PROVIDER=real` 且批量步骤包含 `identify`
- 批量书名简介生成使用 OpenAI provider

未确认时，API 返回 400，并提示当前批量任务可能调用外部 API 并产生费用。

页面不会展示任何 API key。

## 书名简介生成 Provider

批量书名简介生成明确区分：

- `mock`：本地规则引擎，不产生外部 API 费用。
- `openai`：OpenAI 文本生成，需要用户主动选择并确认成本风险。

成本确认只表示用户接受可能产生外部费用，不会自动把 Mock 切换为 OpenAI。批量任务结果摘要会记录每条任务实际使用的 provider。OpenAI 配置缺失或调用失败时，任务项会标记为失败，不会静默回退 Mock。

## API

- `POST /api/batch-jobs`：创建并执行批量任务
- `GET /api/batch-jobs`：查询批量任务列表
- `GET /api/batch-jobs/[id]`：查询批量任务详情
- `POST /api/batch-jobs/[id]/items/[itemId]/retry`：重试失败任务项

## 页面入口

- `/analysis`：批量任务中心，展示任务列表、进度、任务项状态和失败重试。
- `/works`：作品列表支持勾选作品并创建批量识别、评级、书名简介生成、封面评估任务。

## 限制

- 默认不批量调用 OpenAI。
- 默认不批量调用真实搜索 API。
- 不做批量 Image2 重绘。
- 不做 OpenAI 视觉封面评分。
- 效果回流由阶段 18、19 的测试结果复盘流程处理，不在批量任务中心中自动运行。
- 不提供复杂队列、暂停、恢复和并发控制。
