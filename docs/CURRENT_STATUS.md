# CURRENT_STATUS.md

更新时间：2026-06-16

## 当前稳定化状态

`ContentOps Hub` 已进入稳定化和真实业务验收阶段。当前重点是文档事实收敛、核心流程验收、批量任务恢复、成本确认、导出测试和数据安全边界。

当前不再以继续增加阶段编号作为主要开发方式。历史阶段记录已归档到 `docs/archive/phase-notes/`。

## 当前分支和基线版本

- 本地仓库：`https://github.com/KAtOReNA7/ContentOps-Hub.git`
- 当前分支：`fix/batch-job-interruption-recovery`
- 当前基线提交：`0fb89161ae9f5714e640e793a6dd3eff9b700881`
- 远程默认分支：`origin/main`
- 当前分支无 upstream tracking；已执行 `git fetch origin --prune` 获取远程最新状态。

## 已可用流程

- Excel / CSV 作品导入和手动新增作品。
- 作品列表、筛选、分页、勾选、导出和单作品详情页。
- Mock-first 作品识别，支持 configured search 显式入口。
- OpenAI 作品价值评级运行记录、失败留痕、invalid 留痕、人工采用和补充证据。
- Mock / OpenAI 书名简介生成。
- 封面上传、远程封面 URL、Mock 封面评估、原图换标题和单本 Image2 重绘。
- 人工审核状态流和最终采用结果。
- 多书名测试结果导入、复盘和效果洞察。
- 批量任务中心 V1：识别、评级、书名简介生成、封面评估、失败项重试。
- 批量任务中断识别：页面或任务详情读取时会协调超过宽限时间、且当前进程无活动注册的 `running` / `pending` 遗留任务，将未完成项标记为 `PROCESS_INTERRUPTED` 并保留成功结果。
- Excel 和 ZIP 交付导出。
- 设置页运行状态和敏感配置保护视图。

## 最近验证结果

最近一次只读审计：

- Browser 验证路由：`/`、`/import`、`/works`、`/works/new`、`/works/{id}`、`/analysis`、`/experiments/import`、`/settings`
- Browser 结果：页面可打开，详情页关键模块可见，无控制台错误
- `npm run typecheck`：通过
- `npm run lint`：通过
- `npm run build`：首次因 dev server 文件锁失败，停止 dev server 后通过
- `npm run db:test`：通过，`Work count: 27`
- `npm run test:rating-evidence`：通过，有 `MODULE_TYPELESS_PACKAGE_JSON` warning
- `npm run test:batch-recovery`：通过，有 `MODULE_TYPELESS_PACKAGE_JSON` warning

## 当前数据规模

本地 SQLite `prisma/dev.db` 最近只读统计：

| 表 | 行数 |
| --- | ---: |
| `Work` | 27 |
| `BatchJob` | 28 |
| `BatchJobItem` | 441 |
| `WorkIdentification` | 213 |
| `WorkRating` | 137 |
| `WorkRatingRun` | 11 |
| `WorkTitleIntroGeneration` | 66 |
| `WorkCoverEvaluation` | 72 |
| `WorkCoverRender` | 26 |
| `CoverAsset` | 27 |
| `WorkExperimentResult` | 5 |
| `WorkExperimentReview` | 2 |
| `WorkFeedbackInsight` | 0 |

该规模足够做功能冒烟，不足以代表真实批量性能。

## 阻断问题

当前没有已确认的代码级 P0 阻断。稳定化验收前仍需完成 P0 Backlog。

## 非阻断问题

- 当前分支无 upstream tracking，`git pull --ff-only` 不能直接执行；已用 `git fetch origin --prune` 获取远程状态。
- Windows 下 dev server 可能锁定 Prisma engine，导致 build 中 `prisma generate` 出现 `EPERM`。
- `npm run test:rating-evidence` 存在 Node `MODULE_TYPELESS_PACKAGE_JSON` warning。
- Browser 可能阻止直接打开 Excel / ZIP 下载型 API，需要配合 HTTP 或下载事件验证。

## 当前风险

- 批量任务不自动续跑；进程重启后遗留的 `running` / `pending` 会在任务中心或任务详情读取时被识别为中断，未完成项进入可手动重试状态。
- 单本 OpenAI 评级尚未强制显式成本确认。
- Excel / ZIP 结构缺少自动化断言。
- 真实搜索 Provider 未定，继续 Mock-first。
- 远程封面缓存进 ZIP 已延期。
- 远程封面 SSRF 边界仍需补强。

## 已批准下一切片

- 单本 OpenAI 评级增加显式成本确认。

## 尚未批准的工作

- 接入真实搜索 Provider。
- 远程封面缓存进 ZIP。
- 删除旧 rules、`AnalysisResult` 或早期 mock 分析链路。
- 批量替换品牌称呼。
- 引入 Redis、BullMQ、独立 worker、多账号权限或生产部署。
