# 批量任务中心 V1

阶段 17 新增批量任务中心，用于对选中的作品顺序执行常见运营分析步骤。阶段 17.1 补充了书名简介生成 provider 选择和列表密度优化。阶段 19.2 增加创建任务后的进度弹窗，并明确区分识别搜索 provider 和书名简介生成 provider。

## 支持的批量步骤

- 作品识别：`identify`
- 作品价值评级：`rating`
- 书名简介生成：`title_intro`
- 封面评估：`cover_evaluation`

阶段 17 V1 不引入 Redis、BullMQ、后台 worker 或消息队列。任务创建后在本地顺序执行，并保存每条任务项的状态。

阶段 19.2 调整为先创建 `BatchJob` 和 `BatchJobItem`，立即返回任务 ID，再由当前 Node 进程异步顺序执行。作品列表页会弹出进度窗口，每 2 秒轮询 `GET /api/batch-jobs/[id]`。这是本地 MVP 方案，不是可靠后台队列：开发服务重启或进程退出会中断正在运行的任务。

第二个稳定化切片补充了最小中断识别：当前进程维护活动任务注册表；任务中心、任务详情和失败项重试前会检查超过宽限时间且当前进程无活动注册的 `running` / `pending` 遗留任务。确认遗留后，成功或跳过项保持不变，未完成项标记为 `failed`，错误码为 `PROCESS_INTERRUPTED`，用户可在任务中心手动重试。

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

- 批量步骤包含 `identify` 且 `identifyProviderMode=configured`
- 批量书名简介生成使用 OpenAI provider

未确认时，API 返回 400，并提示当前批量任务可能调用外部 API 并产生费用。

页面不会展示任何 API key。

## 识别搜索 Provider

批量作品识别明确区分：

- `identifyProviderMode=mock`：强制使用本地 Mock，不读取真实搜索配置。
- `identifyProviderMode=configured`：读取服务端 `SEARCH_PROVIDER`、`SEARCH_API_KEY`、`SEARCH_BASE_URL` 等配置，尝试调用真实搜索。

如果配置仍为 `SEARCH_PROVIDER=mock`，任务结果会明确记录本次未调用真实搜索。如果真实搜索失败，允许回退 Mock，但每条任务摘要会记录 `actualSearchProvider` 和 `searchFallback`。

## 书名简介生成 Provider

批量书名简介生成明确区分：

- `mock`：本地规则引擎，不产生外部 API 费用。
- `openai`：OpenAI 文本生成，需要用户主动选择并确认成本风险。

成本确认只表示用户接受可能产生外部费用，不会自动把 Mock 切换为 OpenAI。批量任务结果摘要会记录每条任务实际使用的 provider。OpenAI 配置缺失或调用失败时，任务项会标记为失败，不会静默回退 Mock。

真实搜索识别与 OpenAI 文本生成是两种独立外部能力：

- 真实搜索只影响 `identify`。
- OpenAI 文本生成只影响 `title_intro`。
- 选择 OpenAI 文本生成不会自动启用真实搜索。

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
- 不提供复杂队列、暂停、跨进程续跑和并发控制。
- 当前进度轮询依赖本地 Node 进程持续运行；服务重启后只做中断识别和人工重试，不自动重新调用搜索、OpenAI 或 Image2。
