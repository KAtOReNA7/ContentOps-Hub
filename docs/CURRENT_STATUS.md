# CURRENT_STATUS.md

## P0 数据基线说明（2026-06-16）

- 历史文档曾记录 `Work count: 27`，当前开发数据库 `prisma/dev.db` 的只读基线为 `Work count: 20`。
- 当前无法通过 SQLite、Git 或现有日志追溯解释 7 条 Work 记录差异；该事件保留为历史数据基线风险。
- 本稳定化切片不解释、不恢复、不补造缺失记录，只建立后续可追踪性、备份能力和自动测试隔离。
- 当前数据库计数必须以带采集时间的 `npm run db:baseline` 快照为准，不得把某次 `Work=20` 当成永久事实。
- 自动测试不得写入 `prisma/dev.db`；写库测试必须使用 `prisma/test-*.db` 隔离库。

### 当前只读基线

- 采集时间：2026-06-16 16:43:26 +08:00
- Git HEAD：`898b2040e9df8c53ec87545ee0a2fbec82281b07`
- 数据库文件名：`dev.db`
- 文件大小：`1253376`
- SHA-256：`165cbae1989e41eba9a3e1f5659e49462606ef778d9d96235692332990e4dc6d`
- SQLite integrity check：`ok`
- 主要表计数：`Work=20`，`BatchJob=2`，`BatchJobItem=6`，`WorkIdentification=24`，`WorkRating=24`，`WorkRatingRun=3`，`WorkTitleIntroGeneration=10`，`WorkCoverEvaluation=8`，`WorkCoverRender=26`，`CoverAsset=20`

### 数据保护命令

- `npm run db:health`：只读检查开发库 integrity 和主要表计数。
- `npm run db:test`：兼容别名，等同 `npm run db:health`，不写库。
- `npm run db:baseline`：只读生成带时间戳的本地基线快照，输出到 Git 忽略的 `backups/baselines/`。
- `npm run backup:create`：创建本地一致性备份，输出到 Git 忽略的 `backups/`，不包含 `.env`、`.env.local` 或 API Key。

更新时间：2026-06-16

## 当前稳定化状态

`ContentOps Hub` 已进入稳定化和真实业务验收阶段。当前重点是文档事实收敛、核心流程验收、批量任务恢复、成本确认、导出测试、数据安全边界，以及 OpenAI 评级证据复核体验。

当前不再以继续增加阶段编号作为主要开发方式。历史阶段记录已归档到 `docs/archive/phase-notes/`。

阶段 21.3D 已补充完成：作品详情页可展示当前采用 OpenAI 评级、待采用建议、invalid / failed 提示、证据分区、证据标签摘要、人工补充证据和最近 10 条 OpenAI 评级历史。

## 当前分支和基线版本

- 本地仓库：`https://github.com/KAtOReNA7/ContentOps-Hub.git`
- 当前分支：`main`
- 远程默认分支：`origin/main`
- 远程同步基线：`4aca0c8eb08b5f979463074be01fcdec89bd9094`
- 已合并本地保存分支：`codex/save-phase-21-3d-rating-review`

## 已可用流程

- Excel / CSV 作品导入和手动新增作品。
- 作品列表、筛选、分页、勾选、导出和单作品详情页。
- Mock-first 作品识别，支持 configured search 显式入口。
- OpenAI 作品价值评级运行记录、失败留痕、invalid 留痕、人工采用和补充证据。
- 单本真实 OpenAI 评级已要求显式成本确认，API 使用 `costConfirmed: true` 防绕过，并在同一作品已有 running 评级时返回 `RATING_ALREADY_RUNNING`。
- OpenAI 评级证据分区复核，支持 `acceptedEvidence`、`uncertainEvidence`、`rejectedEvidence`、`missingEvidence` 和 `evidenceTags` 展示。
- 人工补充证据支持新增、删除、链接校验和重要程度标记；重新评级时进入 OpenAI 快照，但生成结果仍需人工采用。
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
- `npm run db:test`：历史记录曾为 `Work count: 27`，当前已由 `db:health` / `db:baseline` 取代；最新只读基线见本文顶部 P0 数据基线说明。
- `npm run test:rating-evidence`：通过，有 `MODULE_TYPELESS_PACKAGE_JSON` warning
- `npm run test:batch-recovery`：通过，有 `MODULE_TYPELESS_PACKAGE_JSON` warning

当前稳定化切片验证：

- `npm run test:single-rating-cost`：通过，使用 stub，不调用真实 OpenAI。

阶段 21.3D 本地合并前验证：

- `npm exec -- prisma validate`：通过
- `npm exec -- prisma generate`：通过
- `npm run db:push`：通过
- `npm run typecheck`：通过
- `npm run test:rating-evidence`：通过
- `npm run db:test-rating-openai`：通过
- `npm run db:test`：通过
- `npm run lint`：通过
- `npm run build`：通过

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
