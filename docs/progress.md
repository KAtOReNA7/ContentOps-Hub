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
