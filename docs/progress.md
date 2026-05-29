# 项目进度

更新时间：2026-05-23

## 已完成

- 完成本地开发环境体检，结果记录在 `docs/environment-check.md`。
- 创建项目规则文件 `AGENTS.md`。
- 创建 Next.js + TypeScript + Tailwind CSS MVP 骨架。
- 启用 App Router 和 `src` 目录。
- 添加 Prisma + SQLite 配置和初始 schema。
- 添加基础页面：
  - 首页 dashboard
  - 作品导入页
  - 作品列表页
  - 作品详情页
  - 分析结果页
  - 设置页
- 添加 mock 数据源。
- 添加 mock 作品识别 adapter。
- 添加 mock AI 文本分析 adapter。
- 添加 zod schema 校验。
- 添加批量分析单条失败隔离逻辑。
- 添加 npm scripts：
  - `npm run dev`
  - `npm run build`
  - `npm run lint`
  - `npm run typecheck`
  - `npm run db:push`
  - `npm run db:studio`
- 编写技术设计文档 `docs/technical-design.md`。

## 当前状态

MVP 项目骨架已具备本地页面浏览和 mock 分析闭环。当前页面暂时不连接真实搜索 API、真实 OpenAI API 或真实数据库读写。

## 待完成

- 运行并通过：
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`
- 后续接入 Excel/CSV 导入。
- 将 mock 数据逐步迁移到 SQLite + Prisma。
- 添加真实 OpenAI 文本 API adapter。
- 添加导出 Excel/ZIP。

## 风险和注意事项

- 不要把 API key 写进代码。
- 保留 mock adapter，真实外部服务失败时必须能降级。
- 图片生成批量执行默认关闭。
- 后续每次大改动需要继续更新本文件。

## Prisma 恢复记录

更新时间：2026-05-23

- Prisma 已从 latest 固定到 `6.19.3`，包含 `prisma` 和 `@prisma/client`。
- `npx prisma generate` 已成功生成 Prisma Client。
- `npm run typecheck` 已通过。
- `npm run lint` 已通过。
- `npm run build` 已通过。
- `npm run db:push` 出现 `Schema engine error:` 空错误，未继续死磕 schema engine。
- 临时 `node -e` Prisma 连接测试方式已停止使用；该方式在 PowerShell 下还会受到 `$connect` 变量展开和引号转义影响，不再作为诊断路径。
- 按恢复要求改为创建独立脚本 `scripts/test-prisma-connection.cjs`，并对每条 Prisma 诊断命令设置最多 60 秒等待。
- `npm exec -- prisma -v` 已通过，确认 Prisma CLI 和 Client 均为 `6.19.3`，binaryTarget 为 `windows`。
- `npm exec -- prisma validate` 已通过，schema 有效。
- `npm exec -- prisma generate` 已通过，Prisma Client 可生成。
- `node scripts/test-prisma-connection.cjs` 已通过，输出 `Prisma connected`。
- 结论：Prisma Client 可初始化并连接；当前阻塞点集中在 `prisma db push` 使用的 schema engine 建表流程。

## Prisma 调试方式规范化

更新时间：2026-05-23

- 已废弃 `node -e` Prisma 测试方式；后续不再使用 PowerShell 内联 Node 命令测试 Prisma。
- 已新增并规范化 `scripts/test-prisma-connection.cjs`。
- 已新增 `npm run db:test`，命令为 `node scripts/test-prisma-connection.cjs`。
- 后续 Prisma 检查限定使用：
  - `npm exec -- prisma -v`
  - `npm exec -- prisma validate`
  - `npm exec -- prisma generate`
  - `npm run db:test`
- 每条 Prisma 检查命令最多等待 60 秒，超过则停止并记录 timeout。
- 当前状态：
  - `npm exec -- prisma -v`：通过，Prisma CLI 和 Client 均为 `6.19.3`。
  - `npm exec -- prisma validate`：通过，schema 有效。
  - `npm exec -- prisma generate`：通过，Prisma Client 生成成功。
  - `npm run db:test`：通过，输出 `Prisma connected`。
  - `npm run db:push`：本次复测通过，SQLite 数据库已同步到 Prisma schema。

## 数据库模型阶段收尾检查

更新时间：2026-05-23

按顺序执行结果：

- `git status`：失败，当前目录不是 Git 仓库，输出 `fatal: not a git repository`。
- `npm run typecheck`：通过。
- `npm run lint`：首次失败，原因是 `scripts/test-prisma-connection.cjs` 按要求使用 `require("@prisma/client")`，触发 `@typescript-eslint/no-require-imports`。
- 已做最小 ESLint 配置修正：`eslint.config.mjs` 对 `scripts/**/*.cjs` 关闭 `@typescript-eslint/no-require-imports`，保留 Prisma 诊断脚本的 CommonJS 写法。
- `npm run lint`：修正后通过。
- `npm run build`：通过。
- `npm exec -- prisma validate`：通过。
- `npm exec -- prisma generate`：通过。
- `npm run db:test`：通过，输出 `Prisma connected`。
- `npm run db:push`：通过，数据库已与 Prisma schema 同步。

本轮没有 timeout，没有使用 `node -e` 测试 Prisma，没有删除已完成代码，没有继续开发批量导入功能。

当前结论：

- Prisma / SQLite 已可以用于下一阶段。
- 数据库模型文件 `prisma/schema.prisma` 完整。
- Prisma Client 封装 `src/server/db.ts` 存在。
- Prisma 连接测试脚本 `scripts/test-prisma-connection.cjs` 存在。
- npm scripts 包含 `db:push`、`db:studio`、`db:test`。
- 进入批量导入阶段前，建议先初始化 Git 仓库或切换到正式仓库目录，避免后续缺少版本保护。

## Codex 指令 4 批量导入恢复记录

更新时间：2026-05-23

本阶段状态：

- Codex 指令 4 曾在 `npm run lint` 阶段超过 11 分钟，已中断并进入恢复检查。
- 当前未继续开发下一阶段功能，未删除已完成代码，未继续安装依赖。
- 当前目录仍不是 Git 仓库，`git status` 输出 `fatal: not a git repository`。

已完成部分：

- 新增 `xlsx` 依赖，用于读取 `.xlsx` 和 `.csv` 导入文件。
- 扩展 `prisma/schema.prisma` 的 `Work` 模型，增加导入字段：
  - `externalId`
  - `coverFileName`
  - `category`
  - `currentPlays`
  - `currentCtr`
  - `currentFinish`
  - `notes`
- 新增导入预览与校验逻辑：
  - 缺失必填字段
  - 重复作品
  - 空书名
  - 空作者
  - 点击率格式异常
  - 完播率格式异常
  - 封面文件名缺失
- 新增导入 API：
  - `src/app/api/import/check-duplicates/route.ts`
  - `src/app/api/import/works/route.ts`
- 作品列表已改为从 SQLite / Prisma 读取，并支持按书名、作者、品类筛选和分页。
- 作品详情页已改为展示入库后的基础字段。
- 新增导入格式文档 `docs/import-format.md`。
- 新增示例模板 `sample/input-template.xlsx`。

Prisma / SQLite 状态：

- `externalId` 暂不使用数据库唯一约束，原因是 `db:push` 对新增唯一约束提示潜在数据丢失并阻止执行。
- 未使用 `prisma db push --accept-data-loss`。
- 未使用 `prisma db push --force-reset`。
- 重复检测当前由导入预览校验和 API 写入前检查处理：
  - 预览阶段：`src/app/api/import/check-duplicates/route.ts` 与 `src/lib/import/validation.ts`
  - 写入阶段：`src/app/api/import/works/route.ts`
- 后续正式版本需要恢复数据库层唯一约束，或设计更安全的组合唯一键。
- `npm run db:push` 在移除 `externalId @unique` 后已同步成功，生成 `prisma/dev.db`。

恢复检查结果：

- `npm run typecheck`：通过。
- `npm run build`：通过。
- `npm run db:test`：通过，输出 `Prisma connected`。
- `npm run lint`：本次恢复按要求未再次执行。上一次可见输出为 ESLint warning：`src/lib/import/validation.ts` 中 `ImportColumn` 未使用；需要后续修复后再运行 lint。

当前待修复问题：

- 修复 `src/lib/import/validation.ts` 的未使用类型 warning。
- 手动运行 `npm run dev` 验证导入页面交互、预览和入库流程。
- 当前目录不是 Git 仓库，建议在继续下一阶段前初始化 Git 或切换到正式仓库。

## db:test 卡住修复记录

更新时间：2026-05-23

- `db:test-import` 已通过，说明 `Work` 写入 SQLite 并查询回读的链路可用。
- `db:test` 曾在恢复检查中卡住，旧脚本只执行 `prisma.$connect()`，没有实际数据库查询。
- 已将 `scripts/test-prisma-connection.cjs` 改为最小真实查询版本：
  - 创建 `PrismaClient`
  - 执行 `prisma.work.count()`
  - 输出 `Prisma connected. Work count: <count>`
  - `finally` 中执行 `await prisma.$disconnect()`
  - 最后执行 `process.exit(process.exitCode ?? 0)`
- 当前 `npm run db:test` 已通过，输出 `Prisma connected. Work count: 1`。
- 本次未使用 `node -e`，未运行 lint，未升级 Prisma，未使用 `--accept-data-loss` 或 `--force-reset`，未进入 Codex 指令 5。

## Codex 指令 4 阶段归档

更新时间：2026-05-23

- 批量导入已完成。
- 已手动验证：上传 `sample/input-template.xlsx` 后，可以点击导入并成功写入 SQLite。
- 已手动验证：作品列表可以读取并展示刚入库的数据。
- `db:test-import` 已通过，说明 `Work` 写入 SQLite 并查询回读链路可用。
- `db:test` 已修复为 `prisma.work.count()` 最小真实查询版本，当前通过，输出 `Prisma connected. Work count: 1`。
- 本阶段没有进入作品识别、评级、书名生成、封面生成、搜索 API 或 OpenAI API。
- 归档时发现当前目录尚未初始化 Git 仓库；为创建阶段提交，需要初始化 Git 仓库并提交当前文件。

## Codex 指令 5 作品识别 Mock 恢复记录

更新时间：2026-05-23

- 指令 5 在 `search-adapter.ts` 编辑阶段超过 9 分钟，已中断并进入恢复检查。
- 当前未继续开发评级、书名生成、封面生成、真实搜索 API 或 OpenAI API。
- 当前未运行 `db:push`，未运行 lint，未使用 `node -e`。

当前已写入但未完成验证的内容：

- `prisma/schema.prisma` 已被修改，新增 `WorkIdentification` 模型，并在 `Work` 上新增 `identification` 关系。
- `src/lib/adapters/search-adapter.ts` 已部分扩展：
  - 新增 `SearchAdapter.identifyWork`
  - 新增 Mock 候选作品生成
  - 新增候选评分逻辑，考虑书名相似度、作者一致性、简介关键词、品类和疑似重名
  - 新增最终匹配结果结构
- 新增 API 文件：
  - `src/app/api/works/[id]/identify/route.ts`
  - `src/app/api/works/[id]/identify/confirm/route.ts`
- 新增前端面板文件：
  - `src/app/works/[id]/work-identification-panel.tsx`

当前未完成项：

- 作品详情页尚未接入 `WorkIdentificationPanel`。
- `docs/work-identification.md` 尚未创建。
- Prisma schema 尚未同步到 SQLite。
- 未运行 `typecheck`、`build`、`db:test`、`db:test-import`。
- 当前代码处于可继续编辑状态，但指令 5 尚未完成。

建议拆分：

1. 先完成 schema 同步和 Prisma Client 生成。
2. 再把作品详情页接入识别面板，只展示已有或新跑出的识别结果。
3. 再补 `docs/work-identification.md`。
4. 最后运行限定检查命令并手动测试“运行识别”和“人工确认”。

## Codex 指令 5B 识别结果数据库保存

更新时间：2026-05-23

- 5A 已完成 `MockSearchAdapter` 纯函数模块，提供 `identifyWorkWithMock(work)`。
- 5B 新增最小 `WorkIdentification` 模型，用于保存作品识别结果。
- `Work` 模型新增 `identifications WorkIdentification[]` 关系字段，未修改已有导入业务字段。
- `WorkIdentification` 字段包括：
  - `workId`
  - `candidatesJson`
  - `finalMatchJson`
  - `confidence`
  - `reason`
  - `risksJson`
  - `confirmed`
  - `confirmedTitle`
  - `confirmedAuthor`
- 已修复 `prisma.workIdentification` 类型不存在问题。
- 已最小修复半成品 API，使字段名与 schema 保持一致：
  - `src/app/api/works/[id]/identify/route.ts`
  - `src/app/api/works/[id]/identify/confirm/route.ts`
- `db:push` 已执行。本次是新增表和索引，不涉及删除已有导入数据；执行过程中没有出现数据丢失警告。
- 未使用 `--accept-data-loss`。
- 未使用 `--force-reset`。
- 未升级 Prisma。
- 未使用 `node -e`。
- 未运行 lint。
- 未开发评级、书名生成、封面生成、真实搜索 API 或 OpenAI API。

检查结果：

- `npm exec -- prisma validate`：通过。
- `npm exec -- prisma generate`：通过，Prisma Client 已生成。
- `npm run db:test`：通过，输出 `Prisma connected. Work count: 21`。
- `npm run typecheck`：通过。
- `npm run build`：通过。
- `npm run db:test-import`：通过，测试 Work 可继续写入并查询 SQLite。

影响评估：

- 批量导入功能未被修改。
- `db:test-import` 通过，说明 Work 写入链路仍可用。
- 当前可以继续执行 5C：把作品详情页接入识别结果展示和操作。

## Codex 指令 5C 作品识别 API 收敛

更新时间：2026-05-23

- 5C 已完成后端作品识别 API 收敛。
- `POST /api/works/[id]/identify` 可运行：
  - 根据作品 id 读取 `Work`
  - Work 不存在时返回 404 结构化错误
  - 调用 `identifyWorkWithMock`
  - 将候选结果、最终匹配、置信度、原因、风险保存到 `WorkIdentification`
  - 返回 `{ success: true, data: { identificationId, candidates, finalMatch, confidence, reason, risks } }`
- `POST /api/works/[id]/identify/confirm` 可运行：
  - 请求体需要 `identificationId`
  - 按 `workId + identificationId` 查找识别记录
  - 保存 `confirmed`、`confirmedTitle`、`confirmedAuthor`
  - 不修改原始 `Work` 数据，不删除历史识别结果
- 两个 route handler 均设置 `export const runtime = "nodejs"`。
- 本阶段没有修改页面 UI。
- 本阶段没有修改 `prisma/schema.prisma`。
- 本阶段没有运行 `db:push`。
- 本阶段没有运行 lint。
- 本阶段没有接真实搜索 API 或 OpenAI API。
- 本阶段没有开发评级、书名生成或封面生成。

检查结果：

- `npm run typecheck`：通过。
- `npm run build`：通过。
- `npm run db:test`：通过，输出 `Prisma connected. Work count: 22`。
- `npm run db:test-import`：通过，测试 Work 可继续写入并查询 SQLite。

下一步：

- 可以继续执行 5D：将作品详情页接入识别 API 和识别结果展示。

## Codex 指令 5D 作品详情页识别 UI

更新时间：2026-05-23

- 5D 已完成作品详情页识别 UI。
- 作品详情页现在可以展示“作品识别 Mock”区域。
- 作品详情页可以调用 `POST /api/works/[id]/identify` 运行识别。
- 页面可以展示：
  - 当前识别状态
  - 最终匹配作品名
  - 最终匹配作者
  - 置信度
  - 匹配理由
  - 风险点
  - 候选作品列表
- 候选作品列表展示：
  - 候选作品名
  - 作者
  - 来源平台
  - 简介摘要
  - 匹配分数
  - 匹配理由
  - 排除理由
  - 是否疑似重名
- 页面可以调用 `POST /api/works/[id]/identify/confirm` 进行人工确认。
- 人工确认支持提交：
  - `identificationId`
  - `confirmedTitle`
  - `confirmedAuthor`
- 页面会展示 API 404、API 500、`success: false`、网络请求失败、`identificationId` 缺失等错误。
- 本阶段没有修改 `prisma/schema.prisma`。
- 本阶段没有运行 `db:push`。
- 本阶段没有运行 lint。
- 本阶段没有新增依赖。
- 本阶段没有修改导入页、导入 API 或作品列表基础功能。
- 本阶段没有接真实搜索 API 或 OpenAI API。
- 本阶段没有开发评级、书名生成或封面生成。

检查结果：

- `npm run typecheck`：通过。
- `npm run build`：通过。
- `npm run db:test`：通过，输出 `Prisma connected. Work count: 23`。
- `npm run db:test-import`：通过，测试 Work 可继续写入并查询 SQLite。

下一步：

- 可以手动运行 `npm run dev`，进入作品详情页测试“运行识别”和“人工确认”。
- 手动验证通过后，再进入 Codex 指令 6。

## GitHub 远程仓库关联

更新时间：2026-05-23

- 已关联 GitHub 远程仓库。
- 当前远程地址：`https://github.com/KAtOReNA7/-2.git`
- 当前分支：`main`
- 首次 push：成功，`main` 已推送并跟踪 `origin/main`。
- 当前提交状态：本地已有阶段提交，并已推送到 GitHub。

## Codex 指令 6A 作品价值评级纯规则函数

更新时间：2026-05-23

- 6A 已完成纯 TypeScript 规则评级函数。
- 新增 `src/lib/rating/rating-types.ts`。
- 新增 `src/lib/rating/rating-engine.ts`。
- 新增 `src/lib/rating/rating-engine.examples.ts`，用于展示 3 个手动理解规则的示例输入和输出。
- 评级函数：`evaluateWorkRating(input)`。
- 评级档位：`S`、`A`、`B`、`C`、`D`。
- 输出包含：
  - `rating`
  - `score`
  - `confidence`
  - `reasons`
  - `risks`
  - `evidence`
  - `renameSuggestion`
  - `renameReason`
- 当前规则考虑：
  - 作品识别置信度
  - 书名商业吸引力
  - 简介信息密度
  - 题材商业性
  - 播放量、点击率、完播率
  - 重名或误识别风险
- 本阶段没有修改 `prisma/schema.prisma`。
- 本阶段没有修改 API route。
- 本阶段没有修改 React 页面。
- 本阶段没有运行 `db:push`。
- 本阶段没有新增依赖。
- 本阶段没有运行 lint。
- 本阶段没有接 OpenAI 或真实搜索 API。

检查结果：

- `npm run typecheck`：通过。
- `npm run build`：通过。

下一步：

- 可以进入 6B：将评级规则接入后端保存或 API，但仍需避免接 OpenAI、真实搜索、书名生成和封面生成。

## Codex 指令 6B 评级结果数据库保存

更新时间：2026-05-23

- 6B 已完成评级结果数据库模型。
- 新增 `WorkRating` 模型，用于保存作品价值评级结果。
- `Work` 模型新增 `ratings WorkRating[]` 关系字段。
- `WorkIdentification` 模型新增 `ratings WorkRating[]` 关系字段。
- 未修改 `Work` 既有业务字段。
- 未修改 `WorkIdentification` 既有业务字段。
- 新增 `src/lib/rating/rating-repository.ts`，提供 `saveWorkRating(params)`：
  - 输入 `workId`
  - 可选 `identificationId`
  - 输入 `RatingResult`
  - 将 `reasons`、`risks`、`evidence` 以 JSON 字符串保存
  - 不重新计算评级
  - 不调用 OpenAI
  - 不调用搜索
  - 不修改原始 `Work`
- 新增 `scripts/test-rating-db.cjs`。
- `package.json` 新增 `npm run db:test-rating`。
- 已执行 `db:push`。本次只新增 `WorkRating` 表和索引，没有出现数据丢失警告。
- Prisma Client 已重新生成。
- 未使用 `--accept-data-loss`。
- 未使用 `--force-reset`。
- 未升级 Prisma。
- 未使用 `node -e`。
- 未运行 lint。
- 本阶段没有改页面。
- 本阶段没有改 API。
- 本阶段没有接 OpenAI 或真实搜索。
- 本阶段没有开发书名生成或封面生成。

检查结果：

- `npm exec -- prisma validate`：通过。
- `npm exec -- prisma generate`：通过。
- `npm run typecheck`：通过。
- `npm run build`：通过。
- `npm run db:test`：通过，输出 `Prisma connected. Work count: 24`。
- `npm run db:test-import`：通过，测试 Work 可继续写入并查询 SQLite。
- `npm run db:test-rating`：通过，测试 `WorkRating` 可写入并查询 SQLite。

下一步：

- 可以进入 6C：在不接 OpenAI、不开发生成能力的前提下，将评级规则接入后端流程或 API。

## Codex 指令 6C 作品价值评级 API

更新时间：2026-05-23

- 6C 已完成评级 API。
- 新增 `POST /api/works/[id]/rating`：
  - 根据作品 id 读取 `Work`
  - 读取最近一次 `WorkIdentification`
  - 无识别结果时仍允许评级，并降低置信度、加入风险
  - 调用 `evaluateWorkRating(input)`
  - 调用 `saveWorkRating(params)` 保存评级结果
  - 返回结构化 JSON
- 新增 `GET /api/works/[id]/rating`：
  - 查询最近一次 `WorkRating`
  - 无评级结果时返回 `{ success: true, data: null }`
  - 有评级结果时解析 `reasonsJson`、`risksJson`、`evidenceJson`
- 新增 `docs/rating-api.md`。
- 本阶段没有修改 `prisma/schema.prisma`。
- 本阶段没有运行 `db:push`。
- 本阶段没有修改页面 UI。
- 本阶段没有修改作品识别 API。
- 本阶段没有新增依赖。
- 本阶段没有运行 lint。
- 本阶段没有接 OpenAI 或真实搜索。
- 本阶段没有开发书名生成或封面生成。

检查结果：

- `npm run typecheck`：通过。
- `npm run build`：通过。
- `npm run db:test`：通过，输出 `Prisma connected. Work count: 25`。
- `npm run db:test-import`：通过，测试 Work 可继续写入并查询 SQLite。
- `npm run db:test-rating`：通过，测试 `WorkRating` 可继续写入并查询 SQLite。

下一步：

- 可以进入 6D：将评级结果接入作品详情页展示。

## Codex 指令 6D 作品详情页评级 UI

更新时间：2026-05-24

- 6D 已完成作品详情页评级 UI。
- 作品详情页可以调用 `GET /api/works/[id]/rating` 读取已有评级结果。
- 作品详情页可以调用 `POST /api/works/[id]/rating` 运行评级。
- 页面可以展示：
  - 当前评级状态
  - 评级档位
  - 评级分数
  - 评级置信度
  - 评级理由
  - 风险点
  - 证据说明
  - 多书名运营建议
  - 多书名建议理由
- 页面会展示 GET/POST 失败、`success: false`、网络请求失败、评级字段缺失等错误。
- 本阶段没有修改 `prisma/schema.prisma`。
- 本阶段没有运行 `db:push`。
- 本阶段没有修改 API。
- 本阶段没有修改导入页、导入 API 或作品列表基础功能。
- 本阶段没有接 OpenAI 或真实搜索。
- 本阶段没有开发书名生成或封面生成。
- 本阶段没有创建 Git commit，等待阶段 6 全部完成并手动测试通过后统一提交。

检查结果：

- `npm run typecheck`：通过。
- `npm run build`：通过。
- `npm run db:test`：通过，输出 `Prisma connected. Work count: 26`。
- `npm run db:test-import`：通过，测试 Work 可继续写入并查询 SQLite。
- `npm run db:test-rating`：通过，测试 `WorkRating` 可继续写入并查询 SQLite。

下一步：

- 可以手动运行 `npm run dev` 验证阶段 6：作品详情页识别与评级流程。
- 手动测试通过后，建议统一提交阶段 6。

## Codex 指令 6 阶段归档

更新时间：2026-05-24

- 阶段 6 作品价值评级模块已完成。
- 已手动测试通过。
- 6A 评级规则引擎已完成。
- 6B 评级结果保存能力已完成。
- 6C 评级 API 已完成。
- 6D 评级 UI 已完成。
- `npm run typecheck`：通过。
- `npm run build`：通过。
- `npm run db:test`：通过。
- `npm run db:test-import`：通过。
- `npm run db:test-rating`：通过。
- 阶段 6 未接 OpenAI。
- 阶段 6 未接真实搜索 API。
- 阶段 6 未开发书名生成或封面生成。

## Codex 指令 7A 书名和简介优化 Mock 纯函数

更新时间：2026-05-24

- 7A 已完成书名和简介优化 Mock 纯函数。
- 新增 `src/lib/generation/title-intro-types.ts`，定义生成输入、输出、书名建议、简介建议和封面 prompt 建议结构。
- 新增 `src/lib/generation/title-intro-engine.ts`，提供 `generateTitleIntroSuggestions(input)`。
- 新增 `src/lib/generation/title-intro-engine.examples.ts`，包含 S/B/C/D 档示例输入和输出。
- 当前生成策略根据 `rating.renameSuggestion` 决定：
  - `avoid`：保留原名，仅做轻微简介优化。
  - `cautious`：轻度优化，生成 1-3 个保守书名方向。
  - `recommended`：多书名测试，生成 3-5 个强化题材、冲突、爽点的书名。
  - `strongly_recommended`：重包装，生成 3-5 个更强卖点方向，但不脱离作品信息。
- 本阶段没有修改 `prisma/schema.prisma`。
- 本阶段没有修改 API route。
- 本阶段没有修改 React 页面。
- 本阶段没有新增依赖。
- 本阶段没有运行 `db:push`。
- 本阶段没有运行 lint。
- 本阶段没有使用 `node -e`。
- 本阶段没有接 OpenAI。
- 本阶段没有接真实搜索 API。
- 本阶段没有生成图片，只生成封面 prompt。

检查结果：

- `npm run typecheck`：通过。
- `npm run build`：通过。

下一步：

- 可以进入 7B：在不接 OpenAI、不生成图片、不改页面的前提下，为书名和简介优化结果增加最小数据库保存能力。

## Codex 指令 7B 书名和简介优化结果数据库保存

更新时间：2026-05-24

- 7B 已完成书名/简介生成结果数据库模型。
- 新增 `WorkTitleIntroGeneration` 模型，用于保存书名建议、简介建议、封面 prompt、风险和证据。
- `Work` 模型新增关系字段 `titleIntroGenerations WorkTitleIntroGeneration[]`。
- `WorkIdentification` 模型新增关系字段 `titleIntroGenerations WorkTitleIntroGeneration[]`。
- `WorkRating` 模型新增关系字段 `titleIntroGenerations WorkTitleIntroGeneration[]`。
- 未修改 `Work`、`WorkIdentification`、`WorkRating` 已有业务字段。
- 已执行 `npm exec -- prisma validate`：通过。
- 已执行 `npm exec -- prisma generate`：通过，Prisma Client 已重新生成。
- 已执行 `npm run db:push`：通过。本次只新增 `WorkTitleIntroGeneration` 表和索引，没有出现数据丢失警告。
- 新增 `src/lib/generation/title-intro-repository.ts`，提供：
  - `saveTitleIntroGeneration(params)`：保存生成结果。
  - `getLatestTitleIntroGeneration(workId)`：读取最近一次生成结果。
- 新增 `scripts/test-title-intro-db.cjs`。
- `package.json` 新增 `npm run db:test-title-intro`。
- 本阶段没有改页面。
- 本阶段没有开发 API。
- 本阶段没有接 OpenAI 或真实搜索。
- 本阶段没有生成图片。
- 本阶段没有运行 lint。
- 本阶段没有使用 `node -e`。
- 本阶段没有创建 Git commit。

检查结果：

- `npm run typecheck`：通过。
- `npm run build`：通过。
- `npm run db:test`：通过。
- `npm run db:test-import`：通过。
- `npm run db:test-rating`：通过。
- `npm run db:test-title-intro`：通过。

下一步：

- 可以进入 7C：实现书名和简介优化生成 API。

## Codex 指令 7C 书名和简介优化生成 API

更新时间：2026-05-24

- 7C 已完成书名和简介优化生成 API。
- 新增 `POST /api/works/[id]/title-intro`，可运行 Mock 生成并保存结果。
- 新增 `GET /api/works/[id]/title-intro`，可读取最近一次生成结果。
- 新增 `docs/title-intro-api.md`。
- POST API 会读取作品、最近一次 `WorkIdentification` 和最近一次 `WorkRating`。
- 没有识别结果时使用空候选和低置信识别风险。
- 没有评级结果时使用保守默认评级，并加入“尚未进行作品评级，生成建议置信度较低”风险。
- 历史 JSON 字段解析失败时不会导致 API 崩溃，会返回空数组或空对象，并在 `risks` 中记录解析失败。
- 本阶段没有修改 `prisma/schema.prisma`。
- 本阶段没有运行 `db:push`。
- 本阶段没有改页面 UI。
- 本阶段没有改作品识别 API。
- 本阶段没有改评级 API。
- 本阶段没有接 OpenAI 或真实搜索。
- 本阶段没有生成图片。
- 本阶段没有运行 lint。
- 本阶段没有使用 `node -e`。
- 本阶段没有创建 Git commit。

检查结果：

- `npm run typecheck`：通过。
- `npm run build`：通过。
- `npm run db:test`：通过。
- `npm run db:test-import`：通过。
- `npm run db:test-rating`：通过。
- `npm run db:test-title-intro`：通过。

下一步：

- 可以进入 7D：在作品详情页接入书名和简介优化结果展示与运行按钮。

## Codex 指令 7D 作品详情页书名/简介优化 UI

更新时间：2026-05-24

- 7D 已完成作品详情页书名/简介优化 UI。
- 新增 `src/app/works/[id]/work-title-intro-panel.tsx`。
- 作品详情页已接入“书名和简介优化 Mock”区域。
- 作品详情页可以调用 `GET /api/works/[id]/title-intro` 读取已有生成结果。
- 作品详情页可以调用 `POST /api/works/[id]/title-intro` 运行书名/简介优化生成。
- 页面可以展示：
  - 当前生成状态
  - 生成策略
  - 策略说明
  - 是否建议生成多书名方案
  - 新书名方案列表
  - 新版简介
  - 封面 prompt 列表
  - 风险点
  - 证据说明
- 页面会展示 GET/POST 失败、`success: false`、网络请求失败和 generation 字段缺失等错误。
- 本阶段没有修改 `prisma/schema.prisma`。
- 本阶段没有运行 `db:push`。
- 本阶段没有修改 API。
- 本阶段没有修改导入页、导入 API 或作品列表基础功能。
- 本阶段没有接 OpenAI。
- 本阶段没有接真实搜索 API。
- 本阶段没有生成图片。
- 本阶段没有开发图片生成 API。
- 本阶段没有运行 lint。
- 本阶段没有使用 `node -e`。
- 本阶段没有创建 Git commit，等待阶段 7 手动测试通过后统一提交。

检查结果：

- `npm run typecheck`：通过。
- `npm run build`：通过。
- `npm run db:test`：通过。
- `npm run db:test-import`：通过。
- `npm run db:test-rating`：通过。
- `npm run db:test-title-intro`：通过。

下一步：

- 可以手动运行 `npm run dev` 验证阶段 7：作品详情页书名/简介优化读取和生成流程。
- 手动测试通过后，建议统一提交阶段 7。

## Codex 指令 7 阶段归档

更新时间：2026-05-24

- 阶段 7 书名和简介优化 Mock 模块已完成。
- 已手动测试通过。
- 7A 书名/简介优化 Mock 纯函数完成。
- 7B 生成结果数据库保存能力完成。
- 7C 生成 API 完成。
- 7D 生成 UI 完成。
- `npm run typecheck`：通过。
- `npm run build`：通过。
- `npm run db:test`：通过。
- `npm run db:test-import`：通过。
- `npm run db:test-rating`：通过。
- `npm run db:test-title-intro`：通过。
- 阶段 7 未接 OpenAI。
- 阶段 7 未接真实搜索 API。
- 阶段 7 未生成图片。

## Codex 指令 8A OpenAI 文本生成 Adapter

更新时间：2026-05-24

- 8A 已完成 OpenAI 文本生成 Adapter。
- 已新增 `openai` SDK 依赖，用于后续通过 OpenAI Responses API 生成书名、简介和封面 prompt 文本。
- 已更新 `.env.example`：
  - `OPENAI_API_KEY`
  - `OPENAI_TEXT_MODEL`
- 已新增 OpenAI 结构化输出 JSON Schema。
- 已新增运行时结构校验，OpenAI 输出必须通过 schema 校验后才能作为 `TitleIntroGenerationResult` 使用。
- 本阶段没有修改 `prisma/schema.prisma`。
- 本阶段没有修改 `POST /api/works/[id]/title-intro` 和 `GET /api/works/[id]/title-intro` 的默认行为。
- 本阶段没有修改页面 UI。
- 本阶段没有调用真实 OpenAI API。
- 本阶段没有生成图片。
- 本阶段没有运行 `db:push`。
- 本阶段没有运行 lint。
- 本阶段没有使用 `node -e`。

检查结果：

- `npm run typecheck`：通过。
- `npm run build`：通过。

下一步：

- 检查通过后，可以进入 8B：让生成 API 支持 Mock / OpenAI 切换，但默认仍应保持 Mock。

## Codex 指令 8B title-intro API provider 切换

更新时间：2026-05-24

- 8B 已完成 `title-intro` API provider 切换。
- `POST /api/works/[id]/title-intro` 支持 `mock` / `openai`。
- 请求体为空或未传 `provider` 时，默认 provider 仍是 `mock`。
- `provider=mock` 时继续使用 Mock 规则引擎。
- `provider=openai` 时调用 OpenAI 文本生成 Adapter。
- OpenAI 分支会检查 `OPENAI_API_KEY` 和 `OPENAI_TEXT_MODEL`，缺失时返回结构化错误，不会泄露 API key。
- 生成结果仍使用 `saveTitleIntroGeneration(params)` 保存。
- `GET /api/works/[id]/title-intro` 保持原逻辑，不需要 provider。
- 本阶段没有修改页面 UI。
- 本阶段没有修改 `prisma/schema.prisma`。
- 本阶段没有运行 `db:push`。
- 本阶段没有真实调用 OpenAI API。
- 本阶段没有生成图片，也没有接图片生成 API。
- 本阶段没有运行 lint。
- 本阶段没有使用 `node -e`。

检查结果：

- `npm run typecheck`：通过。
- `npm run build`：通过。
- `npm run db:test`：通过。
- `npm run db:test-import`：通过。
- `npm run db:test-rating`：通过。
- `npm run db:test-title-intro`：通过。

下一步：

- 可以进入 8C：在不改变默认 Mock 行为的前提下，增加手动验证 OpenAI 文本生成的入口或测试说明。

## Codex 指令 8C 作品详情页生成 provider 选择

更新时间：2026-05-24

- 8C 已完成作品详情页书名/简介优化区域 provider 选择。
- 页面默认使用 `Mock 规则引擎`。
- 页面可选择 `OpenAI 文本生成`。
- OpenAI 只在用户主动选择后点击生成时调用。
- 前端不会读取或展示 API key，也不会提供 API key 输入表单。
- 页面会展示 OpenAI 环境变量缺失、调用失败、输出结构校验失败、网络失败和 `success: false` 等错误。
- 本阶段没有修改 `prisma/schema.prisma`。
- 本阶段没有修改 `title-intro` API。
- 本阶段没有运行 `db:push`。
- 本阶段没有真实调用 OpenAI API。
- 本阶段没有接图片生成 API，也没有生成图片。
- 本阶段没有运行 lint。
- 本阶段没有使用 `node -e`。

检查结果：

- `npm run typecheck`：通过。
- `npm run build`：通过。
- `npm run db:test`：通过。
- `npm run db:test-import`：通过。
- `npm run db:test-rating`：通过。
- `npm run db:test-title-intro`：通过。

下一步：

- 可以进入 8D。

## Codex 指令 8D 阶段 8 收尾检查

更新时间：2026-05-24

- 8D 已完成阶段 8 收尾检查。
- 已确认代码中没有写死真实 `OPENAI_API_KEY`。
- 已确认 `.env.example` 不包含真实 API key，并包含：
  - `OPENAI_API_KEY`
  - `OPENAI_TEXT_MODEL`
- 已确认前端不读取、不展示、不提交 API key。
- 已确认 API key 只在服务端 Adapter / API 路由中使用。
- 已确认错误返回不会包含真实 API key。
- 已确认没有 `console.log` / `console.error` 打印 API key。
- 已确认 `.gitignore` 忽略 `.env`、`.env.local`、`.env.*.local`。
- 已完善 `docs/openai-text-generation.md`，补充 `.env.local` 配置、重启开发服务、费用提醒和手动测试流程。
- 已完善 `docs/title-intro-api.md`，补充 provider 请求体示例、默认 Mock、OpenAI 错误返回和 GET 行为说明。
- 本阶段没有修改 `prisma/schema.prisma`。
- 本阶段没有运行 `db:push`。
- 本阶段没有真实调用 OpenAI API。
- 本阶段没有接图片生成 API，也没有生成图片。
- 本阶段没有运行 lint。
- 本阶段没有使用 `node -e`。

检查结果：

- `npm run typecheck`：通过。
- `npm run build`：通过。
- `npm run db:test`：通过。
- `npm run db:test-import`：通过。
- `npm run db:test-rating`：通过。
- `npm run db:test-title-intro`：通过。

下一步：

- 可以手动测试 OpenAI provider。
- 手动测试通过后，建议统一提交阶段 8。

## OpenAI provider timeout 诊断修复

更新时间：2026-05-24

- 已修复 OpenAI provider timeout 诊断。
- 新增 `OPENAI_TIMEOUT_MS`，默认值为 `90000`。
- OpenAI Adapter 现在使用 `OPENAI_TIMEOUT_MS` 配置 SDK timeout。
- timeout 错误会返回 HTTP 504，并显示：
  - `OpenAI request timed out`
  - 当前 timeout 毫秒数
  - 网络、代理、模型延迟或更快模型的排查建议
- 新增 `scripts/test-openai-text.cjs`。
- 新增 `npm run test:openai-text`，用于手动测试 OpenAI Responses API 文本链路。
- 本次没有执行 `npm run test:openai-text`，没有真实调用 OpenAI API。
- 已确认不会打印或暴露 API key。
- 已确认 `.gitignore` 继续忽略 `.env`、`.env.local`、`.env.*.local`。
- 已更新 `.env.example`，包含：
  - `OPENAI_API_KEY`
  - `OPENAI_TEXT_MODEL`
  - `OPENAI_TIMEOUT_MS=90000`
- 已更新 `docs/openai-text-generation.md`，补充低延迟模型、timeout 排查和轻量测试脚本说明。
- 已更新 `docs/title-intro-api.md`，补充 OpenAI timeout 返回说明。
- 本阶段没有修改 `prisma/schema.prisma`。
- 本阶段没有运行 `db:push`。
- 本阶段没有运行 lint。
- 本阶段没有使用 `node -e`。

检查结果：

- `npm run typecheck`：通过。
- `npm run build`：通过。

## OpenAI provider 代理支持修复

更新时间：2026-05-24

- 已新增 `OPENAI_PROXY_URL` 支持。
- 支持代理协议：
  - `http://`
  - `https://`
  - `socks5://`
  - `socks5h://`
- 已确认 v2rayN SOCKS 代理可配置为 `OPENAI_PROXY_URL=socks5h://127.0.0.1:10808`。
- 已新增 `socks-proxy-agent`，用于 SOCKS 代理。
- 已新增 `undici`，用于 HTTP/HTTPS 代理 `ProxyAgent`。
- 已新增 `node-fetch@2`，用于让 SOCKS Agent 在 OpenAI SDK 自定义 fetch 中生效。
- `scripts/test-openai-text.cjs` 已支持输出：
  - `model`
  - `timeoutMs`
  - `usingProxy`
  - `proxyProtocol`
  - `elapsedMs`
- `openai-title-intro-adapter.ts` 已使用同一套代理创建逻辑。
- timeout 错误会返回 `usingProxy`、`proxyProtocol`，并建议检查 `OPENAI_PROXY_URL`。
- 本次没有执行 `npm run test:openai-text`，没有真实调用 OpenAI API。
- 本阶段没有修改 `prisma/schema.prisma`。
- 本阶段没有运行 `db:push`。
- 本阶段没有运行 lint。
- 本阶段没有使用 `node -e`。

检查结果：

- `npm run typecheck`：通过。
- `npm run build`：通过。
# OpenAI 页面 provider 代理链路修复

更新时间：2026-05-24

- 已确认开发者手动执行 `npm run test:openai-text` 成功，输出显示 `usingProxy: true`、`proxyProtocol: socks5h`、模型为 `gpt-5.4-mini`。
- 页面选择 OpenAI provider 时曾返回 `Connection error.`，错误信息不足以确认 API route 实际使用的代理配置。
- 已修复 `openai-title-intro-adapter.ts` 的 OpenAI 请求错误封装：非 timeout 的 OpenAI 请求失败会携带 `errorName`、`errorMessage`、`timeoutMs`、`usingProxy`、`proxyProtocol`、`model`、`status`、`code` 等非敏感诊断信息。
- 已修复 `POST /api/works/[id]/title-intro` 的 OpenAI 错误返回：页面现在可以看到代理协议、timeout、模型和排查提示，不会只显示 `Connection error.`。
- OpenAI Adapter 继续使用与测试脚本等价的 `OPENAI_PROXY_URL` 处理逻辑，支持 `http://`、`https://`、`socks5://`、`socks5h://`。
- 当前可用本地代理配置为 `OPENAI_PROXY_URL=socks5h://127.0.0.1:10808`。
- 已确认 `src/app/api/works/[id]/title-intro/route.ts` 使用 `export const runtime = "nodejs";`。
- 已补充 `docs/openai-text-generation.md`：`test:openai-text` 成功只证明脚本链路可用；页面失败时需确认 Adapter 与脚本使用一致代理逻辑，并在修改 `.env.local` 后重启 `npm run dev`。
- 本阶段没有读取、打印或暴露 `OPENAI_API_KEY`。
- 本阶段没有修改 `prisma/schema.prisma`，没有运行 `db:push`，没有真实调用 OpenAI API，没有创建 Git commit。

检查结果：

- `npm run typecheck`：通过。
- `npm run build`：通过。
# OpenAI client 共享工厂修复

更新时间：2026-05-24

- 开发者已确认 `npm run test:openai-text` 成功，但页面 OpenAI provider 仍返回 `Connection error.`。
- 已新增共享 OpenAI client 工厂 `src/lib/generation/llm/openai-client.cjs`。
- `scripts/test-openai-text.cjs` 已改为复用共享 client 工厂，不再单独创建 OpenAI client 或代理 agent。
- `src/lib/generation/llm/openai-title-intro-adapter.ts` 已改为复用共享 client 工厂，不再单独创建 OpenAI client 或代理 agent。
- 共享 client 工厂支持 `http://`、`https://`、`socks5://`、`socks5h://`，当前本地可用配置为 `OPENAI_PROXY_URL=socks5h://127.0.0.1:10808`。
- 已新增 `scripts/test-openai-title-intro-adapter.cjs` 和 `npm run test:openai-title-intro`，用于手动测试与页面 title-intro OpenAI 生成一致的 client / proxy 链路。
- 本阶段没有读取、打印、提交或暴露 `OPENAI_API_KEY`。
- 本阶段没有修改 `prisma/schema.prisma`，没有运行 `db:push`，没有真实调用 OpenAI API，没有创建 Git commit。

检查结果：

- `npm run typecheck`：通过。
- `npm run build`：失败。失败点是 `prisma generate` 在 Windows 上替换 `node_modules/.prisma/client/query_engine-windows.dll.node` 时返回 `EPERM`，疑似本地 dev server 或 Node/Prisma 进程占用 Prisma engine DLL；未进入 Next 编译阶段。
- `npx next build`：通过。说明 Next 代码编译和共享 CJS client 工厂打包通过，`npm run build` 当前失败原因集中在 Prisma Client 生成阶段的 Windows 文件占用。
# OpenAI title-intro Connection error 诊断增强

更新时间：2026-05-24

- 页面 OpenAI provider 仍返回 `Connection error.`，但代理诊断显示 `usingProxy=true`、`proxyProtocol=socks5h`、`timeoutMs=90000`、`model=gpt-5.4-mini`。
- 已为 `generateTitleIntroWithOpenAI` 增加 `max_output_tokens` 限制，默认读取 `OPENAI_TITLE_INTRO_MAX_OUTPUT_TOKENS`，未配置时使用 `1200`，避免业务生成请求输出过大。
- 已增强 OpenAI 请求错误诊断：结构化错误中可返回非敏感的 `causeName`、`causeCode`、`causeMessage`，用于定位底层 fetch / 代理 / 连接问题。
- 已更新 `.env.example` 和 `docs/openai-text-generation.md`，新增 `OPENAI_TITLE_INTRO_MAX_OUTPUT_TOKENS=1200` 说明。
- 本阶段没有读取、打印、提交或暴露 `OPENAI_API_KEY`。
- 本阶段没有修改 `prisma/schema.prisma`，没有运行 `db:push`，没有创建 Git commit。

检查结果：

- `npm run typecheck`：通过。
- `npx next build`：通过。
# OpenAI SOCKS fetch 兼容修复

更新时间：2026-05-24

- 页面 OpenAI provider 返回的底层 cause 已定位为 `TypeError: nodeFetch is not a function`。
- 根因是 Next/Node 混合加载下 `require("node-fetch")` 可能返回模块对象而不是函数。
- 已修复 `src/lib/generation/llm/openai-client.cjs`：兼容 `node-fetch` 的 CommonJS 函数导出和 `{ default: fetch }` 导出。
- 本阶段没有读取、打印、提交或暴露 `OPENAI_API_KEY`。
- 本阶段没有修改 `prisma/schema.prisma`，没有运行 `db:push`，没有真实调用 OpenAI API，没有创建 Git commit。

检查结果：

- `npm run typecheck`：通过。
- `npx next build`：通过。
# OpenAI title-intro JSON 截断修复

更新时间：2026-05-24

- 页面 OpenAI provider 已能连通并返回内容，但失败于 JSON 解析：`Unterminated string in JSON`。
- 判断原因为 `OPENAI_TITLE_INTRO_MAX_OUTPUT_TOKENS=1200` 过低，结构化 JSON 输出被截断。
- 已将默认 `OPENAI_TITLE_INTRO_MAX_OUTPUT_TOKENS` 从 `1200` 调整为 `3000`。
- 已增强 JSON 解析失败提示：提示可能是输出被截断，并建议增大 `OPENAI_TITLE_INTRO_MAX_OUTPUT_TOKENS` 或缩短生成内容。
- 本阶段没有读取、打印、提交或暴露 `OPENAI_API_KEY`。
- 本阶段没有修改 `prisma/schema.prisma`，没有运行 `db:push`，没有真实调用 OpenAI API，没有创建 Git commit。

检查结果：

- `npm run typecheck`：通过。
- `npx next build`：通过。
## 阶段 8 OpenAI 文本生成归档

更新时间：2026-05-24

- 阶段 8 OpenAI 文本生成已完成。
- 页面 OpenAI provider 已手动测试成功。
- npm run lint：通过。
- npm run typecheck：通过。
- npm run build：通过。
- npm run test:openai-text：通过。
- npm run test:openai-title-intro：通过。
- 默认 provider 仍为 mock。
- OpenAI 仅在用户主动选择 provider=openai 时调用。
- API key 未写入代码。
- .env / .env.local 未提交。
- 阶段 8 未接真实搜索 API。
- 阶段 8 未接图片生成 API。
- 阶段 8 未做导出功能。
## 阶段 9 封面资产、封面评估和审核状态

更新时间：2026-05-24

- 已新增封面资产接入能力，作品详情页支持上传和更换当前封面。
- 已新增本地上传目录 `uploads/covers/`，并加入 `.gitignore`，避免真实封面误提交到 Git。
- 已新增 `CoverAsset` 数据模型，用于保存封面文件名、原始文件名、MIME 类型、大小和本地存储路径。
- 已新增 `WorkCoverEvaluation` 数据模型，用于保存封面评分、评级、优点、问题、处理策略、策略理由和人工确认状态。
- 已新增 Mock 封面评估规则，当前不接 OpenAI 视觉，不接图片生成 API。
- 封面处理策略仅允许：
  - `keep_and_replace_title`
  - `keep_and_optimize_layout`
  - `redraw_cover`
- 作品详情页已新增“封面评估与处理建议”面板，可预览当前封面、运行评估、展示结果、人工确认策略并填写备注。
- 本阶段没有接真实搜索 API。
- 本阶段没有接图片生成 API。
- 本阶段没有调用任何图片生成服务。
- 本阶段没有修改 OpenAI 文本生成逻辑。
- 本阶段没有破坏已有导入、识别、评级、书名简介生成流程。

Prisma 同步：

- `npm exec -- prisma validate`：通过。
- `npm exec -- prisma generate`：通过。
- `npm run db:push`：通过。本次只新增封面相关表和索引，未出现数据丢失警告。

## 阶段 9 补丁：导入封面图片地址

更新时间：2026-05-24

- 导入表格的封面字段现在兼容 `封面地址`、`封面URL`、`封面链接`、`封面文件名`、`coverUrl`、`cover_url`、`coverFileName`。
- 如果封面字段值以 `http://` 或 `https://` 开头，导入 API 会自动创建 `CoverAsset`，`sourceType=remote_url`，并保存 `remoteUrl`。
- 远程封面导入阶段不下载图片、不阻塞校验；作品详情页通过封面文件 API 代理预览。
- 手动上传封面能力保留，`sourceType=local_upload`。
- `CoverAsset` 已新增/调整 `sourceType`、`remoteUrl`、`status`、`errorMessage`，并允许 `storagePath` 对远程封面为空。
- `cover-assets` 文件 API 已支持本地上传文件和远程 URL 两种来源；远程 URL 仅允许 http/https，阻止 localhost、127.0.0.1、0.0.0.0 和常见内网 IP 段，带 timeout、图片 MIME 校验和响应大小限制。
- Mock 封面评估已记录封面来源，远程封面可直接运行评估。
- 本阶段未接真实搜索 API，未接图片生成 API，未调用 OpenAI 视觉评估，未修改 OpenAI 文本生成逻辑。

Prisma 同步：
- `npm exec -- prisma validate`：通过。
- `npm exec -- prisma generate`：通过。
- `npm run db:push`：通过。本次只扩展 `CoverAsset` 字段，未使用 destructive Prisma 命令。
- `npm run db:test`：通过。

检查结果：
- `npm run lint`：通过。
- `npm run typecheck`：通过。
- `npm run build`：通过。

## 阶段 10：Excel 导出 V1

更新时间：2026-05-24

- 已新增 Excel 导出服务层 `src/lib/export/`，聚合 Work、最近一次识别、评级、书名简介生成、封面资产和封面评估结果。
- 已新增 `GET /api/export/works`，支持导出全部作品。
- 已新增 `GET /api/export/works/[id]`，支持导出单本作品。
- 作品列表页已增加“导出全部作品 Excel”按钮。
- 作品详情页已增加“导出当前作品 Excel”按钮。
- 导出文件格式为 `.xlsx`，Sheet 名称为“作品运营建议”。
- 缺失识别、评级、生成或封面评估结果时不会报错，对应字段留空。
- JSON 字段解析失败时写入“解析失败”。
- 本阶段未修改 Prisma schema，未接真实搜索 API，未接图片生成 API，未修改 OpenAI 文本生成逻辑。

检查结果：
- `npm run lint`：通过。
- `npm run typecheck`：通过。
- `npm run build`：通过。
- `npm run db:test`：通过。

## 阶段 10 Excel 导出归档

更新时间：2026-05-24

- 阶段 10 Excel 导出已完成。
- 作品列表页可以导出全部作品 Excel。
- 作品详情页可以导出单本作品 Excel。
- 导出内容包含作品基础信息、识别结果、评级结果、书名简介生成结果、封面评估结果和人工确认备注。
- 缺失识别/评级/生成/封面评估数据时不会导致导出失败。
- 导出结果不包含 API key。
- 导出结果不包含服务器本地绝对路径。
- `npm run lint`：通过。
- `npm run typecheck`：通过。
- `npm run build`：通过。首次执行因本项目 dev server 占用 Prisma Windows DLL 返回 EPERM，关闭相关 Node/Next 进程后重跑通过。
- `npm run db:test`：通过。
- 阶段 10 未接真实搜索 API。
- 阶段 10 未接图片生成 API。
- 阶段 10 未做原图换标题或重绘封面。

## 阶段 11：原图换标题 / 版式优化

更新时间：2026-05-24

- 已新增 `WorkCoverRender` 模型，用于保存新版标题封面生成结果。
- 已新增 `src/lib/cover-render/`，使用 `sharp` 做本地程序化图片合成。
- 支持读取 `local_upload` 和 `remote_url` 两类封面资产。
- 支持输出 `1:1` 和 `3:4` 两种 PNG 封面。
- 已新增 `POST /api/works/[id]/cover/render`，用于生成新版标题封面。
- 已新增 `GET /api/works/[id]/cover/render`，用于读取生成记录和可选新书名。
- 已新增 `GET /api/cover-renders/[id]/file`，用于预览/下载生成图片。
- 作品详情页“封面评估与处理建议”区域已接入生成入口、标题选择/手动输入、预览和下载。
- Excel 导出已补充新版封面 `1:1`、`3:4` 预览地址字段。
- 生成图片保存在 `uploads/cover-renders/{workId}/`，继续由 Git 忽略。
- 本阶段未接图片生成 API，未调用 OpenAI 图片能力，未接真实搜索 API，未修改 OpenAI 文本生成逻辑，未修改封面评估逻辑。

Prisma 同步：
- `npm exec -- prisma validate`：通过。
- `npm exec -- prisma generate`：通过。
- `npm run db:push`：通过。本次只新增 `WorkCoverRender` 表和关系索引，未使用 destructive Prisma 命令。
- `npm run db:test`：通过。

检查结果：
- `npm run lint`：通过。
- `npm run typecheck`：通过。
- `npm run build`：通过。
- `npm run db:test`：通过。

## 阶段 12：ChatGPT Image2 重新绘制封面

更新时间：2026-05-25

- 已复用并扩展 `WorkCoverRender`，用于保存 ChatGPT Image2 重绘结果。
- `WorkCoverRender` 新增 `prompt` 和 `provider` 字段，`provider=chatgpt_image2` 表示阶段 12 重绘结果。
- `WorkCoverRender.coverAssetId` 和 `outputPath` 调整为可空，以支持纯重绘失败记录和无当前封面资产的重绘记录。
- 已新增 `src/lib/image-generation/`：
  - `image-generation-types.ts`
  - `image-generation-adapter.ts`
  - `openai-image2-adapter.ts`
  - `image-generation-service.ts`
  - `cover-redraw-prompt.ts`
- 图片生成业务层统一 provider 为 `chatgpt_image2`，实际 OpenAI 图片模型由 `OPENAI_IMAGE_MODEL` 配置。
- 已新增 `OPENAI_IMAGE_MODEL` 和 `OPENAI_IMAGE_TIMEOUT_MS=120000` 示例环境变量。
- 已新增 `GET /api/works/[id]/cover/redraw`，读取重绘记录、可选新书名和当前有效策略。
- 已新增 `POST /api/works/[id]/cover/redraw`，仅在 `confirmCost=true` 时调用 ChatGPT Image2。
- 重绘接口支持 `1:1` 和 `3:4`，单个比例失败时保存 `failed` 状态和错误信息。
- 生成图片保存到 `uploads/cover-redraws/{workId}/`，继续由 Git 忽略。
- 作品详情页新增 `work-cover-redraw-panel.tsx`，只在当前策略为 `redraw_cover` 时显示。
- 页面支持选择新书名、手动输入标题、选择比例、查看成本提醒、确认后生成、预览和下载。
- 阶段 11 的 `work-cover-render-panel.tsx` 保持只处理 `keep_and_replace_title` / `keep_and_optimize_layout`。
- Excel 导出已补充重绘封面 provider、状态、prompt、结果摘要、1:1/3:4 生成状态和预览地址。
- 已新增文档 `docs/cover-redraw.md`。
- 已更新 `docs/cover-render.md`、`docs/export-excel.md`、`docs/CURRENT_STATUS.md`。

本阶段未接真实搜索 API，未做批量自动重绘，未默认自动调用图片生成，未修改 OpenAI 文本生成逻辑，未修改封面评估逻辑，未破坏阶段 11 原图换标题功能。

检查结果：
- `npm exec -- prisma validate`：通过。
- `npm exec -- prisma generate`：通过。
- `npm run db:push`：通过。首次因本地数据库尚未创建返回空 `Schema engine error`，随后 `npm exec -- prisma db push --skip-generate` 成功同步，再次执行 `npm run db:push` 显示数据库已同步。
- `npm run db:test`：通过，输出 `Prisma connected. Work count: 0`。
- `npm run lint`：通过。
- `npm run typecheck`：通过。
- `npm run build`：通过。

## 阶段 13：人工审核状态流和最终采用结果管理

更新时间：2026-05-28

- 已确认 OpenAI-compatible 中转站支持提交到本地 `main`：`e301cfa feat: 支持 OpenAI 兼容中转站 API`。
- 已在 `Work` 上新增作品级审核状态和最终采用结果字段。
- 审核状态支持：
  - `pending_review`
  - `approved`
  - `rejected`
  - `on_hold`
  - `needs_revision`
- 已新增 `GET /api/works/[id]/review`，读取审核结果、可快速填入的书名/简介建议和可选封面结果。
- 已新增 `POST /api/works/[id]/review`，保存审核状态、最终书名、最终简介、最终封面、审核备注、审核人和审核时间。
- 作品详情页新增“最终采用结果 / 人工审核”区域。
- 支持从原书名、新书名建议、当前简介、新版简介快速填入最终采用内容。
- 支持从原封面、阶段 11 `local_sharp` 结果和阶段 12 `chatgpt_image2` 重绘结果中选择最终封面。
- 作品列表页新增审核状态筛选，并在列表项上显示审核状态。
- Excel 导出新增审核状态、最终书名、最终简介、最终封面地址、最终封面来源、审核备注、审核人和审核时间。
- 已新增文档 `docs/review-workflow.md`。
- 已更新 `docs/export-excel.md`、`docs/CURRENT_STATUS.md`。

本阶段未接真实搜索 API，未做批量自动图片生成，未新增登录 / 权限系统，未引入复杂状态机库，未升级 Prisma。

检查结果：
- 待执行阶段 13 收尾命令。

## �׶� 14��������������Ӫ�����Ż�

����ʱ�䣺2026-05-28

- �ѽ���Ʒ���������Ϊ��������Ӫ�ۺϹ���ƽ̨���������Ᵽ�������ѳ�������������Ӫ�������ߡ���
- ��ҳ�Ѹ�Ϊ��Ӫ���壬չʾ���롢ʶ�����������ɡ���ˡ�����ˡ������ֲ���������Էֲ������״̬�ֲ���
- `/analysis` �ѵ���Ϊ���������������ġ�����ҳ�棬����ȷ��ע Mock ��ʾ���ݡ�
- `/settings` �ѵ���Ϊ��ϵͳ����״̬����ֻչʾ OpenAI�����������ݿ�ͳɱ�����״̬������ʾ API Key��
- ��Ʒ�б�֧������ɸѡ����ǰɸѡ Excel ��������ѡ��Ʒ Excel �����͵�ǰɸѡ ZIP ������������
- Excel ������������չʾ���ղ��ý������������������������Ժ� Image2 �ػ�ժҪ��
- ZIP ���������� Excel �Ϳɶ�ȡ�������ղ��÷����ļ���ȱʧ���治���жϵ�����
- ����/������ɳɹ����֪ͨ���滻������ػ�ģ��ˢ�º�ѡ����������Ҫ���ֶ�ˢ��ҳ�档
- ���ղ��ý�������������ѡ��ťֱ��չʾ��ʵ������
- ���׶�δ����ʵ���� API��δĬ���������� OpenAI��δĬ����������ͼƬ��δ�޸� Prisma schema��

## �׶� 15�������빤�������ư�

����ʱ�䣺2026-05-28

- �����ֶ�������Ʒ��ں� `/works/new` ҳ�棬��Ӫ��Ա�ɲ����� Excel ¼�뵥����Ʒ��
- ���� `POST /api/works`��֧�ִ��� Work��Զ�̷��� URL �ʲ��ͱ����ϴ������ʲ���
- ����¼��֧�����������ߡ����ࡢ��顢��ע������ URL�����ط��桢������������ʺ��겥�ʡ�
- ����У�������������������Ǹ������������/�겥��֧�ְٷֱȻ�С�������� URL ����Ϊ http/https��
- ��ע�ֶ��ѽ������������ͷ��� prompt ���������ģ���ע��������Ʒ��ֵ����������
- ��Ʒ����ҳ������������ʶ��״̬��ʾ��δʶ��ʱ��ʾ������ʶ�𣬵����Ŷ�δȷ��ʱ��עԤ���������˹�ȷ��ʱ��ʾ����Ϊ��ʽ�ο���
- ���������������ȥ�����ԵĹ̶� Mock ���⣬����֧�� Mock / OpenAI provider��
- ���׶�δ�޸� Prisma schema��δ����ʵ���� API��δ�� OpenAI �Ӿ����֣�δĬ���������� OpenAI��

## �׶� 15 �������ֶ�����֧��ҵ����Ʒ ID

����ʱ�䣺2026-05-29

- `Work.externalId` ����Ϊҵ�����Ʒ ID ʹ�ã��������ݿ��ڲ�������
- �ֶ�������Ʒ������������Ʒ ID��������ֶ�Ϊ `externalId`���׶� 15 ����Ϊѡ�
- `POST /api/works` �ѱ��������д�� `externalId`��
- ��Ʒ����ҳչʾҵ����Ʒ ID��δ��дʱ��ʾ��δ��д����
- ��Ʒ�б�֧�ְ�ҵ����Ʒ ID ����������������Ʒ���·�չʾ��Ʒ ID��
- Excel/CSV ������� `��ƷID`��`��Ʒ ID`��`externalId`��`sourceWorkId` ӳ�䵽 `Work.externalId`��
- Excel ����ʹ�á���Ʒ ID���е��� `externalId`���������ݿ��ڲ� id ��Ϊ��Ҫ�����ֶΡ�
- ������δ�޸��ڲ����� id��δΪ `externalId` ����ΨһԼ����δ�޸� Prisma schema��

## �׶� 16����ʵ��������Ʒ��ֵ��������

����ʱ�䣺2026-05-29

- ��������ʵ���� provider ����㣬Ĭ�� `SEARCH_PROVIDER=mock`��
- ������������ػ���������`SEARCH_PROVIDER`��`SEARCH_API_KEY`��`SEARCH_BASE_URL`��`SEARCH_TIMEOUT_MS`��`SEARCH_MAX_RESULTS`��
- �ѱ��� MockSearchAdapter����ʵ����ʧ��ʱ���� Mock��������ʧ��֤�ݺͷ�����ʾ��
- �������ͳһΪ `SearchResultItem`���������⡢���ӡ�ժҪ����Դ���ơ���Դ���͡�ƥ����⡢ƥ�����ߡ�������ʾ��������ʾ��ԭʼ������
- ����ʶ�� query ���ۺ����������ߡ�ҵ����Ʒ ID��Ʒ�ࡢ���ؼ��ʺ�������/С˵�ؼ��ʡ�
- `WorkIdentification` ����չ�������� provider��query�����������֤�ݡ�������ʾ����ԴժҪ��
- ��Ʒ����ҳʶ��������չʾ���� provider��query����ѡ��Դ����Դ���͡���Դ���ӡ�ƥ�����ɡ����պ͡�Ϊʲô���Ȿ����
- ��Ʒ��ֵ�����ѽ�ʶ�����ŶȴӼ�ֵ���а��룬ʶ�����Ŷ�ֻӰ���������ŶȺ�Ԥ������ʾ��
- ����������֤�����ֲο���������ƽ̨֤�����ȣ�������ƽ̨��������������/�罻ý��/δ֪��ԴȨ�ؽϵ͡�
- �����������߼��ѵ���Ϊ��������Ӫ�жϣ�����ʶ����ճ�������ʾ���˹�ȷ�ϡ�
- ����ҳ���������� API ����״̬���Ҳ�չʾ `SEARCH_API_KEY` ���ݡ�
- �������ĵ� `docs/search-api.md` �� `docs/rating-v2.md`��

���׶�δ�� OpenAI �Ӿ��������֣�δ�����������������ģ�δ��Ч��������δĬ������������ʵ���� API��δ���� Prisma��

## 阶段 17 批量任务中心 V1

更新时间：2026-05-30

- 新增 BatchJob / BatchJobItem，用于保存批量任务和单条任务项状态。
- 新增批量任务 API：创建任务、查询任务列表、查询任务详情、重试失败项。
- `/analysis` 已改造为批量任务中心，可查看进度、成功/失败/跳过数量和失败项原因。
- 作品列表支持勾选作品并创建批量识别、批量评级、批量书名简介生成、批量封面评估任务。
- 批量任务采用本地顺序执行，不引入 Redis / BullMQ / 后台 worker。
- 单条失败不会中断整批，有成功有失败时任务状态为 partial_success。
- SEARCH_PROVIDER=real 或 OpenAI 文本批量生成场景需要成本确认。
- 本阶段未做批量 Image2 重绘，未做 OpenAI 视觉评分，未做效果回流。

### 阶段 17 检查结果

- npm exec -- prisma validate：通过。
- npm exec -- prisma generate：通过。
- npm run db:push：通过，仅同步新增 BatchJob / BatchJobItem 表和索引。
- npm run db:test：通过。
- npm run typecheck：通过。
- npm run lint：通过。
- npm run build：通过。
- 本地存在 `.env`、`.env.local` 和 `prisma/dev.db`，未出现在 git status 中，不应提交。

## 阶段 17.1 批量操作体验与 provider 选择修复

更新时间：2026-05-30

- 作品列表批量操作区新增书名简介生成方式选择：Mock 规则引擎 / OpenAI 文本生成。
- 成本确认仅表示用户接受外部 API 费用风险，不再暗示自动切换 OpenAI。
- 批量 title_intro 创建任务时会把 titleIntroProvider 传给后端。
- provider=openai 且未确认成本风险时返回 400 中文错误，不执行任务。
- provider=openai 且缺少 OPENAI_API_KEY 或 OPENAI_TEXT_MODEL 时返回清晰中文错误，不回退 Mock。
- 批量任务 resultSummaryJson 会记录实际 provider。
- 作品列表支持 pageSize=50/100，切换后保留筛选条件并回到第 1 页。
- 作品列表简介默认压缩为 2 行，完整简介可进入详情页查看或 hover 查看。
