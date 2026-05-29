# 项目交接说明

更新时间：2026-05-28

## 一句话概览

本项目是“番茄畅畅听多书名运营辅助工具”的本地 MVP，用于把有声书作品从 Excel/CSV 导入，经过作品识别、价值评级、书名简介生成、封面评估、封面处理，再导出可交付 Excel。

当前最新提交：

```text
e301cfa feat: 支持 OpenAI 兼容中转站 API
```

当前分支：

```text
main
```

## 当前完成到哪里

当前已完成到阶段 16 V1 进行中。

已完成能力：

- Excel/CSV 作品导入。
- 作品列表、筛选、分页和作品详情页。
- Mock 作品识别和人工确认。
- SABCD 作品价值评级。
- Mock 书名 / 简介 / 封面 prompt 生成。
- OpenAI 文本生成 provider，可手动选择，默认仍为 Mock。
- OpenAI 代理、timeout 和测试脚本。
- 封面本地上传、远程封面 URL 导入与预览。
- Mock 封面评估和人工确认策略。
- Excel 导出，支持全部作品和单本作品。
- 阶段 11：基于原封面换标题 / 版式优化，输出 `1:1` 和 `3:4`。
- 阶段 12：针对 `redraw_cover` 路径，手动确认后调用 ChatGPT Image2 重绘封面。
- 阶段 13：作品级人工审核状态流和最终采用结果管理。
- 阶段 14：运营看板、页面定位和基础 UI 可读性优化。
- 阶段 15：单本作品录入与业务作品 ID 支持。
- 阶段 16：真实搜索 provider 适配层、识别证据保存和价值评分升级。

当前仍未完成：

- 真实搜索 API。
- 批量自动图片生成。
- OpenAI 视觉评估。
- ZIP 交付包导出。
- 多版本最终采用结果管理。

## 重要边界

当前项目仍是 MVP，不要提前做复杂功能。

禁止事项：

- 不要默认批量调用 OpenAI。
- 不要接真实搜索 API，除非明确进入对应阶段。
- 不要默认自动生成图片。
- 不要提交 `.env` / `.env.local`。
- 不要把 API key 写进代码。
- 不要提交 `node_modules`、`.next`、`uploads` 下真实图片。
- 不要升级 Prisma 到 7。
- 不要使用 destructive Prisma 命令。
- 不要删除已完成代码，除非先说明原因并得到确认。

## 技术栈

- Next.js App Router
- TypeScript
- Tailwind CSS
- SQLite
- Prisma 6.19.3
- xlsx
- sharp
- OpenAI SDK
- socks-proxy-agent / undici / node-fetch，用于 OpenAI 代理链路

## 本地运行

安装依赖：

```bash
npm install
```

同步数据库：

```bash
npm run db:push
```

启动开发服务：

```bash
npm run dev
```

访问：

```text
http://localhost:3000
```

常用检查：

```bash
npm run lint
npm run typecheck
npm run build
npm run db:test
```

如果修改 Prisma schema，按顺序执行：

```bash
npm exec -- prisma validate
npm exec -- prisma generate
npm run db:push
npm run db:test
```

注意：禁止用 `node -e` 测试 Prisma。

## 环境变量

参考 `.env.example`。

基础：

```text
DATABASE_URL="file:./dev.db"
```

OpenAI 文本生成：

```text
OPENAI_API_KEY=
OPENAI_TEXT_MODEL=
OPENAI_TIMEOUT_MS=90000
OPENAI_TITLE_INTRO_MAX_OUTPUT_TOKENS=3000
OPENAI_PROXY_URL=
```

ChatGPT Image2 封面重绘：

```text
OPENAI_IMAGE_MODEL=
OPENAI_IMAGE_TIMEOUT_MS=120000
```

说明：

- OpenAI 文本生成默认不会调用，只有用户在页面选择 OpenAI provider 后才调用。
- ChatGPT Image2 只有在 `redraw_cover` 区域勾选成本确认并点击生成后才调用。
- 业务层统一图片生成 provider 为 `chatgpt_image2`，实际模型名由 `OPENAI_IMAGE_MODEL` 配置。

## 核心数据模型

主要模型在 `prisma/schema.prisma`：

- `Work`：作品基础信息。
- `WorkIdentification`：作品识别结果。
- `WorkRating`：SABCD 评级结果。
- `WorkTitleIntroGeneration`：书名、简介、封面 prompt 生成结果。
- `CoverAsset`：封面资产，本地上传或远程 URL。
- `WorkCoverEvaluation`：封面评估和人工确认策略。
- `WorkCoverRender`：阶段 11 原图换标题结果和阶段 12 重绘结果。
- `Work` 上的 `reviewStatus`、`finalTitle`、`finalIntro`、`finalCoverUrl` 等字段：阶段 13 最终采用结果。
- `WorkIdentification` 上的 `searchProvider`、`searchQuery`、`searchResultsJson`、`evidenceJson` 等字段：阶段 16 搜索证据。

`WorkCoverRender` 区分两种来源：

- `provider=local_sharp`：阶段 11，基于原封面程序化换标题。
- `provider=chatgpt_image2`：阶段 12，调用 ChatGPT Image2 重绘封面。

## 关键目录

```text
src/app/import/                         导入页面
src/app/works/                          作品列表与详情页
src/app/api/import/                     导入 API
src/app/api/works/[id]/identify/        作品识别 API
src/app/api/works/[id]/rating/          评级 API
src/app/api/works/[id]/title-intro/     书名简介生成 API
src/app/api/works/[id]/cover/           封面上传、评估、确认、渲染、重绘 API
src/app/api/export/                     Excel 导出 API
src/lib/import/                         导入校验
src/lib/adapters/                       Mock 搜索和文本 adapter
src/lib/rating/                         评级规则
src/lib/generation/                     书名简介生成
src/lib/cover/                          封面评估
src/lib/cover-render/                   阶段 11 原图换标题
src/lib/image-generation/               阶段 12 ChatGPT Image2 重绘
src/lib/export/                         Excel 导出
prisma/schema.prisma                    数据模型
docs/                                  阶段文档
```

## 当前主要工作流

1. 导入 Excel/CSV。
2. 在作品列表进入作品详情。
3. 运行 Mock 作品识别。
4. 人工确认识别结果。
5. 运行价值评级。
6. 生成书名 / 简介 / 封面 prompt，可选 Mock 或 OpenAI 文本 provider。
7. 上传或使用导入的封面。
8. 运行封面评估。
9. 人工确认封面策略：
   - `keep_and_replace_title`
   - `keep_and_optimize_layout`
   - `redraw_cover`
10. 如果是前两类策略，使用阶段 11 原图换标题。
11. 如果是 `redraw_cover`，使用阶段 12 ChatGPT Image2 重绘。
12. 导出 Excel。
13. 人工审核并保存最终采用结果，导出时优先带出最终结果。

## 阶段 12 状态

阶段 12 已实现：

- 新增 `src/lib/image-generation/` 适配层。
- 新增 `POST /api/works/[id]/cover/redraw`。
- 新增 `GET /api/works/[id]/cover/redraw`。
- 新增作品详情页“重新绘制封面”区域。
- 只有用户确认成本后才调用 ChatGPT Image2。
- 支持 `1:1` 和 `3:4`。
- 单个比例失败时保存 `failed` 状态和错误信息。
- 生成图片保存在 `uploads/cover-redraws/{workId}/`。
- Excel 导出已包含重绘 provider、状态、prompt、结果摘要和预览地址。

待手动验证：

- 在真实 `OPENAI_API_KEY` 和 `OPENAI_IMAGE_MODEL` 下，实际生成 `1:1` 和 `3:4` 图片。
- 验证环境变量缺失时，页面错误结构化且不泄露密钥。
- 验证 Excel 中重绘字段符合交付预期。

## 阶段 13 状态

阶段 13 已实现：

- 作品级审核状态：待审核、已采用、已退回、暂缓、需修改。
- 最终书名、最终简介、最终封面、审核备注、审核人、审核时间保存。
- 新增 `GET /api/works/[id]/review` 和 `POST /api/works/[id]/review`。
- 作品详情页新增“最终采用结果 / 人工审核”区域。
- 作品列表页新增审核状态筛选。
- Excel 导出新增最终采用和审核字段。

## 阶段 16 状态

阶段 16 已实现：

- 默认 Mock-first 的搜索 provider 架构。
- 可配置 `SEARCH_PROVIDER=real/custom` 的真实搜索适配层。
- 搜索失败回退 Mock，并保存结构化风险。
- 识别结果保存搜索 query、搜索结果、证据、风险提示和来源摘要。
- 评级逻辑将识别置信度从价值分中剥离，低置信度只影响评级可信度和预评级提示。
- 作品详情页展示“为什么是这本”的搜索证据。
- 设置页展示搜索 API 配置状态，不展示 API key。

## 下一阶段建议

建议先手动测试阶段 16 的 mock、real 配置缺失 fallback、识别证据展示和评级可信度变化，再考虑具体搜索服务厂商适配。

原因：

- 针对具体搜索服务补充 provider 字段映射。
- 优化搜索证据的人工确认体验。
- 继续完善交付包的运营体验。

继续暂缓：

- 真实搜索 API。
- 批量自动重绘。
- OpenAI 视觉评估。
- 复杂模板系统。

## 推荐阅读顺序

给新接手开发者：

1. `README.md`
2. `AGENTS.md`
3. `docs/project-handoff.md`
4. `docs/CURRENT_STATUS.md`
5. `docs/progress.md`
6. `prisma/schema.prisma`
7. `docs/import-format.md`
8. `docs/rating-api.md`
9. `docs/title-intro-api.md`
10. `docs/cover-evaluation.md`
11. `docs/cover-render.md`
12. `docs/cover-redraw.md`
13. `docs/export-excel.md`

## 当前可交付说明

可以向其他人说明：

> 当前 MVP 已经形成“导入 -> 识别证据 -> 评级 -> 生成建议 -> 封面处理 -> 人工审核 -> Excel/ZIP 导出”的基本闭环。默认使用 Mock / 本地规则，真实搜索、OpenAI 文本和 ChatGPT Image2 图片能力均为用户主动触发，不会默认产生外部成本。下一步建议先验证阶段 16 的真实搜索 fallback 和评级可信度，再做具体搜索服务厂商适配。
