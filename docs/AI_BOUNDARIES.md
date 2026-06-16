# AI_BOUNDARIES.md

## 总原则

- 外部 AI 和真实搜索能力必须由用户主动选择或明确授权。
- 结果必须允许人工采用、拒绝或修正。
- 不把失败的外部请求伪装成成功结果。
- 不在代码、页面、日志、文档或导出文件中展示 API key。

## 调用真实 OpenAI 的操作

- 单本 OpenAI 作品价值评级：`/api/works/[id]/rating/run`。
- 批量评级：批量任务 `rating` step，固定使用 OpenAI 评级，单次最多 10 部作品。
- OpenAI 书名简介生成：单本或批量选择 OpenAI 文本 provider 时。
- ChatGPT Image2 封面重绘：单本封面重绘中选择 Image2 provider 时。

## 默认 Mock 或本地规则的操作

- 作品识别默认 Mock。
- 书名简介生成默认 Mock。
- 封面评估使用本地规则。
- 效果复盘和效果洞察使用本地可解释规则。
- 真实搜索供应商未确定前继续 Mock-first。

## 成本确认

当前已要求成本确认的场景：

- 单本真实搜索识别。
- 批量 configured search 识别。
- 批量 OpenAI 书名简介生成。
- 批量 OpenAI 评级。
- 单本 Image2 封面重绘。

已批准 Backlog：

- 单本 OpenAI 评级增加显式成本确认。

## 图片生成边界

- 图片生成不得默认批量执行。
- Image2 仅允许单本作品手动确认成本后触发。
- 批量任务中心不提供 Image2 批量重绘。
- OpenAI 视觉评分当前不在实现范围。

## 人工采用边界

- OpenAI 评级建议不会自动覆盖当前采用评级。
- 只有用户点击采用后，成功运行结果才投影到 `WorkRating`。
- 书名、简介和封面最终结果都由人工审核保存。
- 效果洞察不自动覆盖最终采用结果。

## 真实搜索边界

- 未确定正式搜索 Provider 前继续 Mock-first。
- configured search 只有在用户选择并确认成本风险后才读取真实搜索配置。
- 搜索失败时允许 Mock fallback，但必须明确标记 `searchFallback`、实际 provider、错误和 HTTP 状态。
- 不允许在搜索失败时假装完成网络搜索。
- 搜索证据只辅助识别和评级，不自动成为最终事实。

## OpenAI 失败边界

- OpenAI 配置缺失、请求失败或输出 invalid 时，保存 failed / invalid 状态。
- 不回退到 rules、Mock 或旧结果作为新的正式评级。
- OpenAI 输出必须通过结构化 schema 校验。
- 缺失证据默认进入提示，不直接扣分。
## 单本 OpenAI 评级成本确认

- 单本作品真实 OpenAI 评级入口：`POST /api/works/[id]/rating/run`、`POST /api/works/[id]/rating/rerun`、兼容 `POST /api/works/[id]/rating`。
- 真实 OpenAI 调用必须在请求体中传入 `costConfirmed: true`。
- 缺少确认时返回 `COST_CONFIRMATION_REQUIRED`，不会调用 OpenAI，不会创建成功评级记录，也不会消耗外部 API 额度。
- 查看历史评级、人工采用已有结果、补充证据新增/删除等不触发外部 API 的操作不需要成本确认。
- 本轮没有新增公开 Mock 评级模式；自动测试使用内部 stub，不调用真实 OpenAI。

## 单本 OpenAI 评级错误码

- `OPENAI_NOT_CONFIGURED`：API Key、模型、Base URL 或代理配置不可用。
- `OPENAI_TIMEOUT`：OpenAI 请求超时。
- `OPENAI_NETWORK_ERROR`：网络、DNS、代理或连接失败。
- `OPENAI_AUTH_ERROR`：401 / 403 鉴权失败。
- `OPENAI_RATE_LIMITED`：429 限流。
- `OPENAI_UPSTREAM_ERROR`：上游服务异常。
- `OPENAI_INVALID_RESPONSE`：模型输出为空、非 JSON 或结构不符合评级 schema。
- `RATING_ALREADY_RUNNING`：同一作品已有评级运行中。

错误响应只返回稳定错误码、用户可读消息和处理建议，不返回 API Key、完整 Base URL、请求头、堆栈或上游敏感正文。
