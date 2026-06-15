# ARCHITECTURE.md

## 技术栈

- Next.js App Router
- React / TypeScript
- Tailwind CSS
- Prisma 6.19.3
- SQLite
- `xlsx`
- `sharp`
- OpenAI SDK
- `undici`、`node-fetch`、`socks-proxy-agent`

## 页面层

页面位于 `src/app/`：

- `/`：运营看板。
- `/import`：作品导入。
- `/works`：作品列表、筛选、勾选、导出和批量操作。
- `/works/new`：手动新增作品。
- `/works/[id]`：单作品运营控制台。
- `/analysis`：批量任务中心。
- `/experiments/import`：多书名测试结果导入。
- `/settings`：运行状态和安全配置视图。

页面层负责展示、表单交互、轮询和调用 API，不直接访问外部服务。

## API 层

API route 位于 `src/app/api/`，主要包括：

- `import/*`：导入模板、重复检查、作品入库。
- `works/*`：新增、更新、识别、评级、书名简介、封面、审核、实验和洞察。
- `batch-jobs/*`：批量任务创建、查询和失败项重试。
- `export/*`：Excel 与 ZIP 导出。
- `cover-assets/*`、`cover-renders/*`：封面文件读取。
- `experiments/*`：测试结果模板和导入。

API 层负责参数解析、成本确认、错误结构化和服务层调用。

## 服务层

核心服务位于 `src/lib/`：

- `adapters/search-adapter.ts`：Mock 和 configured search 识别入口。
- `rating/openai-rating-service.ts`：OpenAI 评级运行、采用、补充证据。
- `rating/openai-rating-provider.ts`：OpenAI 评级 provider 和 schema 校验。
- `generation/*`：书名简介生成和 OpenAI 文本生成。
- `cover/*`、`cover-render/*`、`image-generation/*`：封面评估、渲染和 Image2。
- `batch-jobs/batch-job-service.ts`：批量任务创建、执行、摘要和重试。
- `batch-jobs/batch-job-recovery.ts`：批量任务进程中断识别、活动任务注册和遗留任务幂等协调。
- `experiments/*`、`feedback/*`：实验导入、复盘和效果洞察。
- `export/*`：导出查询、行映射、Excel 和 ZIP 构建。

## Prisma 数据层

数据模型位于 `prisma/schema.prisma`。核心模型：

- `Work`：作品基础信息、运营指标、审核状态和最终采用字段。
- `WorkIdentification`：识别候选、证据、风险、搜索 provider 和人工确认。
- `WorkRatingRun`：OpenAI 评级运行历史、状态、模型、输入快照和原始响应。
- `WorkRating`：已采用评级的兼容投影，旧 rules 结果只作为历史兼容。
- `WorkRatingSupplement`：人工补充证据。
- `WorkTitleIntroGeneration`：书名、简介和封面 Prompt 生成记录。
- `CoverAsset`：本地上传或远程 URL 封面资产。
- `WorkCoverEvaluation`：封面评估和人工确认。
- `WorkCoverRender`：原图换标题和 Image2 重绘结果。
- `BatchJob` / `BatchJobItem`：本地顺序批量任务和任务项。
- `WorkExperimentResult` / `WorkExperimentReview`：测试结果和复盘。
- `WorkFeedbackInsight`：效果洞察和评分校准。

`AnalysisResult` 是早期 mock 分析遗留模型，当前仅作为删除候选标记，不在本切片删除。

## 搜索 Provider

搜索由 `search-adapter` 统一进入：

- `mock`：默认模式，本地 Mock，不产生外部请求。
- `configured`：用户确认成本后读取 `SEARCH_PROVIDER`、`SEARCH_API_KEY`、`SEARCH_BASE_URL` 等配置。

真实搜索失败可以 fallback 到 Mock，但必须记录实际 provider、fallback 标记、HTTP 状态和来源摘要。

## OpenAI 评级 Provider

OpenAI 评级通过 `runOpenAIRating` 创建 `WorkRatingRun`：

1. 读取作品、最近识别、封面评估、实验复盘、效果洞察和人工补充证据。
2. 标准化搜索证据，过滤弱来源和不相关结果。
3. 调用 OpenAI provider。
4. 校验结构化输出。
5. 保存 success / invalid / failed 状态。
6. 用户采用后投影到 `WorkRating`。

OpenAI 失败不回退 rules。

## 批量任务

批量任务先写入 `BatchJob` 和 `BatchJobItem`，立即返回任务 ID，再由当前 Node 进程异步顺序执行。页面通过轮询查看进度。

当前不是可靠后台队列：进程退出或开发服务重启会中断运行中任务。系统维护当前进程活动任务注册表，并在动态执行的 `GET /api/batch-jobs`、`GET /api/batch-jobs/[id]` 和失败项重试前做幂等协调。若数据库中任务仍为 `running` / `pending`、当前进程没有活动注册、且超过 `BATCH_JOB_INTERRUPTION_GRACE_MS` 默认 30000 毫秒宽限时间，未完成项会标记为 `failed + PROCESS_INTERRUPTED`，已成功或跳过项保持原状态和结果。该策略只提供中断识别和人工重试入口，仅适用于当前本地单 Node 进程运行模式；多实例共享数据库不受当前注册表保护，不构成跨进程续跑，也不会自动调用搜索、OpenAI 或 Image2。

## 封面处理

封面处理分为：

- `CoverAsset`：保存本地上传或远程 URL 信息。
- `WorkCoverEvaluation`：本地规则评估。
- `WorkCoverRender`：原图换标题和 Image2 输出。

远程封面读取限制协议和私有地址，读取失败会记录错误。远程封面缓存进 ZIP 已延期。

## 实验与效果回流

测试结果导入写入 `WorkExperimentResult`，复盘写入 `WorkExperimentReview`，效果洞察写入 `WorkFeedbackInsight`。当前使用可解释规则，不做复杂统计显著性检验或机器学习训练。

## 导出服务

导出服务通过 `findWorksForExport` 聚合作品和关联结果，再映射为 Excel 行。ZIP 导出包含 Excel 和可读取到的本地最终封面；缺少封面不阻断 ZIP。

## 主要数据流

```text
导入 / 手动新增
  -> Work / CoverAsset
  -> 作品识别 WorkIdentification
  -> OpenAI 评级 WorkRatingRun
  -> 人工采用 WorkRating
  -> 书名简介 WorkTitleIntroGeneration
  -> 封面评估 WorkCoverEvaluation
  -> 封面渲染 WorkCoverRender
  -> 人工审核 Work.final*
  -> 测试结果 WorkExperimentResult / WorkExperimentReview
  -> 效果洞察 WorkFeedbackInsight
  -> Excel / ZIP 导出
```
