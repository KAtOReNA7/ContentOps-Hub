# OPERATIONS.md

## 数据库基线与备份

本地开发数据库默认为 `prisma/dev.db`。历史上曾出现文档记录 `Work count: 27`、当前只读基线 `Work count: 20` 的差异，现有 SQLite、Git 和日志无法追溯解释该差异。本项目保留该事件为历史数据基线风险，不恢复、不补造缺失记录。

常用命令：

```bash
npm run db:health
npm run db:baseline
npm run backup:create
```

- `db:health` 只读检查开发库 integrity 和主要表数量。
- `db:baseline` 生成本地基线快照到 `backups/baselines/`。
- `backup:create` 使用 SQLite 一致性能力备份 `dev.db`、`uploads/` 和 `.env.example`，并生成 manifest。
- `backups/` 被 Git 忽略；备份不包含 `.env`、`.env.local`、API Key 或本地绝对路径。

## 人工恢复步骤

当前不提供无需确认的自动恢复命令。需要恢复时按以下步骤人工处理：

1. 停止开发服务器和所有可能占用 SQLite 的 Node 进程。
2. 对当前异常状态先执行一次紧急备份，避免覆盖唯一现场。
3. 选择目标备份目录。
4. 校验 `manifest.json` 中的数据库 SHA-256 和文件大小。
5. 对目标备份数据库运行 SQLite integrity check。
6. 手工替换 `prisma/dev.db` 和 `uploads/`。
7. 运行 `npm exec -- prisma validate`。
8. 运行 `npm run db:health`。
9. 启动项目。
10. 使用 Browser 抽查 `/works`、单作品详情、`/analysis`、`/settings` 等核心页面。

警告：

- 不要在开发服务器运行时覆盖 `dev.db`。
- 不要自动删除当前数据库。
- 不要把 `.env` 或 `.env.local` 从备份中恢复。
- 未经用户明确授权，不要对 `dev.db` 执行 reset、seed、`deleteMany` 或 fixture 清理。

## Windows 开发环境

本项目当前主要在 Windows + PowerShell 环境下开发。路径中包含空格时，命令应使用引号或 `-LiteralPath`。Markdown 文件统一按 UTF-8 读取和写入。

## dev server 与 Prisma 文件锁

`npm run dev` 会启动 Next.js dev server，并可能持有 Prisma engine 或 `.next` 下的文件。Windows 下如果 dev server 仍在运行，`npm run build` 中的 `prisma generate` 可能出现类似错误：

```text
EPERM: operation not permitted, rename ... query_engine-windows.dll.node.tmp... -> query_engine-windows.dll.node
```

处理方式：

1. 停止 `npm run dev`。
2. 确认没有当前项目路径下的 `next dev` / Node 子进程。
3. 重新运行 `npm run build` 或 Prisma 命令。

## UTF-8 文档读取要求

部分 PowerShell 默认输出可能把 UTF-8 中文显示为乱码。读取文档时优先使用明确 UTF-8 的工具，例如：

```powershell
python -c "from pathlib import Path; print(Path('README.md').read_text(encoding='utf-8'))"
```

不要仅凭控制台乱码判断文档内容已损坏。Browser 中页面中文显示正常时，应继续核对文件编码和读取方式。

## 数据库和上传文件备份

本地数据默认包含：

- `prisma/dev.db`
- `uploads/`

它们已被 `.gitignore` 排除。真实业务验收前，应备份这两类文件。不要提交本地 SQLite 数据库、上传图片或真实业务数据。

## 环境变量保护

- 不提交 `.env` 或 `.env.local`。
- 设置页只能显示 key 是否存在、服务 host 或协议类型，不显示密钥、代理账号、完整代理地址或本地敏感路径。
- 导出文件不得包含 API key、本地数据库路径或服务器绝对路径。

## 常见恢复步骤

### Prisma 或 build 卡住

1. 停止 dev server。
2. 检查项目路径下的 Node 进程。
3. 重新运行：

```bash
npm exec -- prisma validate
npm exec -- prisma generate
npm run db:test
npm run build
```

每条命令最多等待 60 秒，超时后停止并记录恢复报告。

### 批量任务失败

1. 打开 `/analysis`。
2. 选择失败任务。
3. 查看失败项的 `errorCode`、`errorMessage` 和摘要。
4. 对单条失败项执行重试。

### 批量任务进程中断

当前实现不会引入 Redis、BullMQ、独立 worker 或外部队列。该注册表策略仅适用于当前本地单 Node 进程运行模式；多实例共享数据库不受当前注册表保护，也不构成跨进程续跑。任务中心和任务详情读取时会执行一次幂等协调：

1. 仅检查数据库中仍为 `running` / `pending` 的任务。
2. 如果当前 Node 进程活动注册表中仍有该任务，不会标记中断。
3. 如果任务最近活动时间未超过 `BATCH_JOB_INTERRUPTION_GRACE_MS`，不会立即标记中断；默认宽限时间为 30000 毫秒。
4. 确认为遗留任务后，成功或跳过的 `BatchJobItem` 保持原状态和结果摘要。
5. 未完成的 `running` / `pending` 项会标记为 `failed`，错误码为 `PROCESS_INTERRUPTED`。
6. 页面会提示应用进程中断、成功结果已保留、未完成项目可手动重试。

恢复逻辑不会自动重新调用搜索、OpenAI 或 Image2。涉及真实搜索或 OpenAI 的失败项仍必须由用户主动重试，并继续遵守现有成本确认、10 本限制和 Provider 边界。

### 外部 API 配置缺失

1. 在 `/settings` 查看是否已配置。
2. 补充 `.env.local`。
3. 重启 dev server。
4. 重新执行单本操作，不批量重试收费 API。

## 批量任务当前限制

批量任务 V1 是本地顺序执行，不是可靠后台队列：

- 不使用 Redis、BullMQ 或独立 worker。
- 进度依赖当前 Node 进程持续运行。
- 服务重启后，系统可以识别遗留 `running` / `pending` 并把未完成项转为可重试的 `PROCESS_INTERRUPTED`。
- 系统不会跨进程续跑、不会自动重试、不会自动调用收费 Provider；多实例共享数据库不受当前进程注册表保护。
