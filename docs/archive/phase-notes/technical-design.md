# 历史归档，不再作为当前事实源

本文档保留早期 MVP 骨架设计说明，其中关于 mock-data 页面、早期目录结构和阶段目标的描述已经过时。当前架构请查看 `../../ARCHITECTURE.md`。

# 技术设计

项目名称：番茄畅畅听多书名运营辅助工具  
当前阶段：MVP 项目骨架

## 目标

为不懂代码的有声书运营人员提供一个本地可运行工具，用于批量查看作品、预览导入数据、执行 mock 分析、查看多书名和简介运营建议。

当前版本只实现 mock 数据闭环，不连接真实搜索 API，不连接真实 OpenAI API。

## 技术栈

- Next.js App Router
- TypeScript
- Tailwind CSS
- SQLite
- Prisma
- zod

## 目录结构

```text
.
├── docs
│   ├── environment-check.md
│   ├── progress.md
│   └── technical-design.md
├── prisma
│   └── schema.prisma
├── src
│   ├── app
│   │   ├── analysis
│   │   ├── import
│   │   ├── settings
│   │   ├── works
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── lib
│   │   ├── adapters
│   │   ├── services
│   │   ├── mock-data.ts
│   │   └── schemas.ts
│   └── server
│       └── db.ts
├── AGENTS.md
├── package.json
└── tsconfig.json
```

## 页面

- `/`：首页 dashboard，展示导入数、已分析数、待分析数、失败任务数。
- `/import`：作品导入页，当前展示 mock Excel/CSV 预览。
- `/works`：作品列表页，展示 mock 作品。
- `/works/[id]`：作品详情页，展示单本 mock 分析结果。
- `/analysis`：分析结果页，展示批量 mock 分析结果。
- `/settings`：设置页，展示 mock adapter、图片批量生成关闭等关键策略。

## 数据库设计

当前使用 Prisma + SQLite，schema 已建立：

- `Work`：作品基础信息。
- `AnalysisResult`：作品分析结果。
- `WorkStatus`：作品状态枚举，包含 `imported`、`analyzed`、`failed`。

页面当前暂时读取 `src/lib/mock-data.ts`，后续步骤再从 Prisma 切换到真实本地数据库读写。

## Adapter 设计

所有外部服务必须走 adapter，当前实现：

- `SearchAdapter`
  - 文件：`src/lib/adapters/search-adapter.ts`
  - 当前实现：`mockSearchAdapter`
  - 作用：模拟作品识别、类型判断、市场标签和相似标题模式。

- `AiTextAdapter`
  - 文件：`src/lib/adapters/ai-text-adapter.ts`
  - 当前实现：`mockAiTextAdapter`
  - 作用：模拟评分、评级、摘要、推荐书名、推荐简介和风险提示。

后续真实 OpenAI 文本 API 和图片 API 必须新增 adapter，不能直接散落在页面或业务服务里。

## zod 校验

结构化数据集中在 `src/lib/schemas.ts`：

- `WorkSchema`
- `AnalysisResultSchema`

AI 文本 adapter 的输出必须通过 `AnalysisResultSchema.parse` 校验后才能返回。

## 批量任务策略

批量分析入口在 `src/lib/services/analysis-service.ts`。

`getBatchAnalysisResults` 对每条作品单独 `try/catch`，返回：

- `{ ok: true, work, data }`
- `{ ok: false, work, error }`

单条失败不会影响整体任务完成。

## 网络和密钥策略

- 当前版本不请求真实外部 API。
- `.env.example` 只提供变量名，不写入真实 API key。
- `.env` 当前只包含本地 SQLite `DATABASE_URL`。
- 图片生成批量执行默认关闭，仅在设置页展示策略。

## npm scripts

- `npm run dev`：启动本地开发服务器。
- `npm run build`：生成 Prisma client 并构建 Next.js。
- `npm run lint`：运行 ESLint。
- `npm run typecheck`：运行 TypeScript 类型检查。
- `npm run db:push`：同步 Prisma schema 到 SQLite。
- `npm run db:studio`：打开 Prisma Studio。

## 后续演进

1. 将 mock 导入页替换为 Excel/CSV 解析。
2. 使用 Prisma 存储导入作品。
3. 保留 mock adapter，新增真实文本 API adapter。
4. 对 OpenAI 输出继续使用 zod 校验。
5. 在批量分析中加入任务状态、失败重试和结果导出。
