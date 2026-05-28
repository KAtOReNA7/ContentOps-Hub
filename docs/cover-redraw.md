# ChatGPT Image2 封面重绘

更新时间：2026-05-25

## 目标

阶段 12 支持对封面处理策略为 `redraw_cover` 的作品，手动调用 ChatGPT Image2 重新绘制封面图。

本阶段只处理 `redraw_cover` 路径；`keep_and_replace_title` 和 `keep_and_optimize_layout` 继续由阶段 11 的原图换标题 / 版式优化能力处理。

## 环境变量

需要配置：

```text
OPENAI_API_KEY=
OPENAI_BASE_URL=
OPENAI_TEXT_ENDPOINT=responses
OPENAI_IMAGE_MODEL=
OPENAI_IMAGE_TIMEOUT_MS=120000
OPENAI_PROXY_URL=
```

业务层统一 provider 名称为 `chatgpt_image2`。实际 OpenAI 图片模型名由 `OPENAI_IMAGE_MODEL` 配置，适配层负责兼容 OpenAI SDK / API 的底层模型名称。

连接模式：

- 官方 OpenAI 模式：不填 `OPENAI_BASE_URL`。
- OpenAI 兼容中转站模式：填写 `OPENAI_BASE_URL`，例如 `https://example.com/v1`，并使用中转站 API key。
- `OPENAI_BASE_URL` 必须是 API 根地址，例如 `https://example.com/v1`，不能填写 `https://example.com/v1/chat/completions` 这类具体接口路径。
- 文本生成默认使用 `OPENAI_TEXT_ENDPOINT=responses`；如果中转站不支持 Responses API 并报 `404 /v1/responses`，可改为 `OPENAI_TEXT_ENDPOINT=chat_completions`。
- `OPENAI_BASE_URL` 是 API 目标地址，`OPENAI_PROXY_URL` 是本地代理地址，例如 `socks5h://127.0.0.1:10808`。
- 中转站模型名必须以中转站后台为准。
- 图片重绘仍会调用 OpenAI Images 接口，中转站需要支持 `/v1/images/generations`。

缺少 `OPENAI_API_KEY` 或 `OPENAI_IMAGE_MODEL` 时，接口会保存失败状态并返回结构化错误信息，不会泄露 API key。

## 流程

1. 作品已有基础信息、书名简介生成结果、评级结果和封面评估结果。
2. 用户进入作品详情页。
3. 当封面评估或人工确认策略为 `redraw_cover` 时，页面显示“重新绘制封面”区域。
4. 用户选择已生成的新书名，或手动输入标题。
5. 用户选择生成比例，默认 `1:1` 和 `3:4`。
6. 页面展示成本提醒。
7. 只有用户确认成本后，接口才调用 ChatGPT Image2。
8. 生成结果写入 `WorkCoverRender`，页面可预览和下载。

## 数据保存

阶段 12 复用并扩展 `WorkCoverRender`：

- `strategy=redraw_cover`
- `provider=chatgpt_image2`
- `prompt` 保存本次重绘提示词
- `outputRatio` 保存 `1:1` 或 `3:4`
- `outputPath` 保存受控的相对路径
- `status` 保存 `success` 或 `failed`
- `errorMessage` 保存失败诊断信息

生成图片保存到：

```text
uploads/cover-redraws/{workId}/
```

`uploads/` 已被 Git 忽略，真实生成图片不应提交。

## Prompt 规则

重绘 prompt 会综合：

- 原书名
- 新书名
- 作者
- 简介
- 品类 / 题材
- 评级结果
- 书名简介生成结果
- 封面评估问题
- 封面处理策略理由

prompt 目标是中文有声书 / 网文运营封面，强调商业吸引力、题材氛围、卖点表达和清晰标题区域。prompt 明确禁止敏感内容、明星肖像、未授权 IP、平台名、具体艺术家姓名和纯艺术海报式偏离。

## API

### GET /api/works/[id]/cover/redraw

读取最近的 ChatGPT Image2 重绘记录、可选新书名和当前有效封面策略。

### POST /api/works/[id]/cover/redraw

请求体示例：

```json
{
  "titleText": "新版标题",
  "ratios": ["1:1", "3:4"],
  "confirmCost": true
}
```

也可以用 `titleSuggestionIndex` 从最近一次书名简介生成结果中选择标题。

只有 `confirmCost=true` 时才会真实调用 ChatGPT Image2。

如果没有封面评估结果，仍允许重绘，但会返回 warning。如果当前策略不是 `redraw_cover`，也允许执行，但会返回 warning。

## 为什么不默认批量生成

图片生成会产生外部 API 成本和耗时。本阶段只提供单作品、用户主动确认后的手动重绘，不做批量自动重绘，不在导入、评估或导出时自动触发。

## 手动测试

1. 配置 `.env.local`，填写 `OPENAI_API_KEY` 和 `OPENAI_IMAGE_MODEL`。
2. 运行 `npm run dev`。
3. 进入作品详情页。
4. 确认该作品已有书名简介生成结果。
5. 确认该作品已有封面评估结果。
6. 将封面策略设为 `redraw_cover`，或选择本来就是 `redraw_cover` 的作品。
7. 选择一个新书名，或手动输入标题。
8. 查看成本提醒，并勾选确认。
9. 点击“确认并重新绘制”。
10. 确认 `1:1` 和 `3:4` 结果可预览、可下载。
11. 刷新页面，确认记录仍存在。
12. 导出 Excel，确认重绘 provider、状态、prompt、结果摘要和比例生成状态已写入。
13. 临时移除图片环境变量，确认错误结构化且不泄露密钥。
