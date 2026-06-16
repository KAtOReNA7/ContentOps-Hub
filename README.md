<div align="center">
  <img src="docs/assets/readme/readme-hero.png" alt="ContentOps Hub" width="100%" />

  <h1>ContentOps Hub</h1>

  <p><strong>本地优先的有声书多书名运营工作台</strong></p>

  <p>
    面向有声书运营团队，从作品导入、识别、评级、书名简介生成、封面评估、封面处理、人工审核、多书名测试回流到 Excel / ZIP 交付，沉淀一套可真实验收的运营工作流。
  </p>

  <p>
    <img alt="Next.js" src="https://img.shields.io/badge/Next.js-App_Router-black" />
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-Strict-blue" />
    <img alt="Prisma" src="https://img.shields.io/badge/Prisma-SQLite-2D3748" />
    <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind-CSS-38B2AC" />
    <img alt="OpenAI" src="https://img.shields.io/badge/OpenAI-Manual_Only-10A37F" />
    <img alt="Status" src="https://img.shields.io/badge/Stabilization-Business_Acceptance-blue" />
  </p>
</div>

---

## 当前状态

项目已进入稳定化和真实业务验收阶段。当前不以继续堆叠阶段编号为主要开发方式，优先处理核心流程、数据风险、错误恢复、性能、测试覆盖和文档一致性。

当前真实状态以 [docs/CURRENT_STATUS.md](docs/CURRENT_STATUS.md) 为准。历史阶段流水账已归档到 [docs/archive/phase-notes/](docs/archive/phase-notes/)。

## 数据安全命令

本地开发数据库默认为 `prisma/dev.db`。历史 `Work count: 27` 到当前 `Work count: 20` 的差异仍不可追溯；项目不宣称已经恢复或解释缺失记录。后续以带时间戳的基线快照为准。

```bash
npm run db:health
npm run db:baseline
npm run backup:create
npm run test:database-isolation
```

- `db:health` / `db:test`：开发库只读健康检查。
- `db:baseline`：生成本地基线快照到 Git 忽略的 `backups/baselines/`。
- `backup:create`：创建本地一致性备份，不包含 `.env`、`.env.local` 或 API Key。
- `test:database-isolation`：验证写库测试使用隔离 `prisma/test-*.db`，且 `dev.db` 业务表逻辑摘要不变。

## 产品概览

ContentOps Hub 服务于不懂代码的有声书运营人员，帮助运营团队批量处理作品资料，并快速判断：

- 哪些作品适合做多书名测试
- 哪些作品不建议轻易改名
- 哪些作品需要重新提炼卖点
- 当前封面应该保留、换标题、优化版式，还是后续重绘
- 最终采用哪一个书名、简介和封面
- 如何把运营建议导出成可交付 Excel / ZIP

系统默认保持本地优先和 Mock-first。真实搜索、OpenAI 文本生成和 ChatGPT Image2 封面重绘均需要用户主动触发，不默认批量调用收费能力。

## 已可用能力

| 模块 | 当前状态 |
| --- | --- |
| Excel / CSV 导入 | 支持预览、校验、重复检测和入库 |
| 手动新增作品 | 支持业务作品 ID、作品类型、远程封面 URL 和本地封面上传 |
| 作品列表与详情 | 支持搜索、筛选、分页、勾选、导出和单作品运营控制台 |
| 作品识别 | Mock-first，可显式选择 configured search，保存候选、证据、风险和人工确认 |
| OpenAI 价值评级 | 保存运行历史、失败/invalid 状态、人工采用和补充证据 |
| 书名 / 简介生成 | 支持 Mock 与 OpenAI provider，可保存生成结果 |
| 封面处理 | 支持封面资产、Mock 评估、原图换标题、单本 Image2 重绘 |
| 人工审核 | 保存最终书名、简介、封面、审核状态、审核人和备注 |
| 测试结果回流 | 支持多书名测试结果导入、复盘和效果洞察 |
| 批量任务 | 支持识别、评级、书名简介生成、封面评估、失败重试 |
| 导出交付 | 支持 Excel 与 ZIP，ZIP 不因缺少最终封面阻断 |

## Interface Preview

> Preview images are design references generated for the UI redesign direction. They are not production screenshots.

<div align="center">
  <img src="docs/assets/readme/readme-dashboard.png" alt="ContentOps Hub Dashboard" width="100%" />
  <p><em>运营看板：从导入、识别、评级、审核到复盘与效果洞察的整体进度视图。</em></p>
</div>

<table>
  <tr>
    <td width="50%">
      <img src="docs/assets/readme/readme-work-detail.png" alt="Work Detail Preview" width="100%" />
      <p align="center"><strong>单作品运营详情</strong></p>
      <p align="center">聚合搜索证据、价值评级、书名方案、简介生成、封面策略与下一步操作。</p>
    </td>
    <td width="50%">
      <img src="docs/assets/readme/readme-batch-jobs.png" alt="Batch Job Center Preview" width="100%" />
      <p align="center"><strong>批量任务中心</strong></p>
      <p align="center">支持批量识别、评级、书名简介生成和封面评估，单条失败不影响整体。</p>
    </td>
  </tr>
</table>

## 正式文档

- [产品定位](docs/PRODUCT.md)
- [核心工作流](docs/WORKFLOWS.md)
- [架构说明](docs/ARCHITECTURE.md)
- [AI 与搜索边界](docs/AI_BOUNDARIES.md)
- [运维与恢复](docs/OPERATIONS.md)
- [测试策略](docs/TESTING.md)
- [验收标准](docs/ACCEPTANCE.md)
- [当前状态](docs/CURRENT_STATUS.md)
- [Backlog](docs/BACKLOG.md)
- [历史阶段归档](docs/archive/phase-notes/)

## 本地运行

```bash
npm install
npm run db:push
npm run dev
```

常用检查：

```bash
npm run typecheck
npm run lint
npm run build
npm run db:test
```

专项测试：

```bash
npm run test:rating-evidence
```

Windows 下如果 `npm run build` 或 Prisma 命令遇到文件锁，先停止 `npm run dev` 再重试。详细说明见 [docs/OPERATIONS.md](docs/OPERATIONS.md)。

## 环境变量

请参考 `.env.example`。不要提交 `.env` 或 `.env.local`。

- `DATABASE_URL`：本地 SQLite 数据库
- `OPENAI_API_KEY`：仅服务端读取，不展示到前端
- `OPENAI_TEXT_MODEL`：文本生成模型
- `OPENAI_RATING_MODEL`：作品价值评级模型，可回退读取 `OPENAI_TEXT_MODEL`
- `OPENAI_IMAGE_MODEL`：图片生成模型
- `OPENAI_PROXY_URL`：可选代理，支持 `http` / `https` / `socks5` / `socks5h`
- `SEARCH_PROVIDER`：搜索 provider，默认 `mock`
- `SEARCH_API_KEY`：真实搜索 API key，仅服务端读取
- `SEARCH_BASE_URL`：真实搜索 API 地址
- `SEARCH_TIMEOUT_MS` / `SEARCH_MAX_RESULTS`：单本识别搜索超时和结果数量
- `SEARCH_EXPANDED_QUERY_LIMIT` / `SEARCH_QUERY_DELAY_MS`：扩展 query 控制
- `SEARCH_429_RETRY_COUNT` / `SEARCH_429_RETRY_DELAY_MS`：429 限流退避

## 安全策略

- 不把 API key 写入代码、文档、日志、页面或导出文件
- 不提交本地数据库、上传图片、`.env` 或 `.env.local`
- OpenAI 仅用户主动选择时调用
- 真实搜索仅用户主动选择并确认成本风险时触发，默认仍为 Mock-first
- 图片生成不做默认批量任务
- 所有外部服务都必须保留 Mock 或本地 fallback，并明确标记实际 provider
