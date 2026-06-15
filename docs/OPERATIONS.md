# OPERATIONS.md

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

### 外部 API 配置缺失

1. 在 `/settings` 查看是否已配置。
2. 补充 `.env.local`。
3. 重启 dev server。
4. 重新执行单本操作，不批量重试收费 API。

## 批量任务当前限制

批量任务 V1 是本地顺序执行，不是可靠后台队列：

- 不使用 Redis、BullMQ 或独立 worker。
- 进度依赖当前 Node 进程持续运行。
- 服务重启后，运行中任务不会自动恢复。
- 下一稳定化切片已批准实现最小批量任务恢复能力。
