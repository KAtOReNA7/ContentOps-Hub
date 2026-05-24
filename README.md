# 番茄畅畅听多书名运营辅助工具

面向有声书运营人员的本地 MVP 工具，用于批量导入作品、分析作品运营价值、生成多书名与简介建议、评估封面策略，并导出运营可用的 Excel 结果。

## 当前能力

- Excel / CSV 作品批量导入
- 作品列表与作品详情页
- Mock 作品识别与人工确认
- SABCD 作品价值评级
- Mock / OpenAI 书名简介生成
- 封面资产上传与远程封面 URL 预览
- 封面评估与人工确认处理策略
- 基于原封面生成新版标题封面
- 单本作品 / 全部作品 Excel 导出

## 技术栈

- Next.js App Router
- TypeScript
- Tailwind CSS
- SQLite
- Prisma
- xlsx
- sharp
- OpenAI SDK

## 本地运行

```bash
npm install
npm run db:push
npm run dev
```

默认访问：

```text
http://localhost:3000
```

## 常用命令

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
npm run db:test
npm run db:push
npm run db:studio
```

OpenAI 文本链路测试：

```bash
npm run test:openai-text
npm run test:openai-title-intro
```

## 环境变量

复制 `.env.example` 为 `.env.local`，按需填写：

```env
OPENAI_API_KEY=
OPENAI_TEXT_MODEL=
OPENAI_TIMEOUT_MS=90000
OPENAI_PROXY_URL=
OPENAI_TITLE_INTRO_MAX_OUTPUT_TOKENS=3000
```

注意：

- 不要提交 `.env` 或 `.env.local`。
- 不要把 API key 写入代码。
- OpenAI 仅在用户主动选择 OpenAI provider 时调用。
- 默认生成 provider 仍为 Mock。

## 数据与文件

- SQLite 数据库用于本地存储作品和分析结果。
- 本地上传封面与生成封面保存到 `uploads/`。
- `uploads/` 不应提交到 Git。
- 远程封面 URL 在导入阶段不会被下载入库。

## 导入模板

示例模板位于：

```text
sample/input-template.xlsx
```

封面字段支持填写文件名或远程图片地址。远程图片地址以 `http://` 或 `https://` 开头时，会自动创建远程封面资产。

## 导出

支持：

- 作品列表页导出全部作品 Excel
- 作品详情页导出当前作品 Excel

导出内容包含作品基础信息、识别结果、评级结果、书名简介建议、封面评估、人工确认结果和新版封面结果。

## 开发约束

- 不要默认批量调用 OpenAI。
- 不要提交真实 API key、真实客户数据或真实封面图片。
- 不要使用 destructive Prisma 命令。
- Prisma 连接测试使用 `npm run db:test`。
- 修改阶段完成后运行 `lint`、`typecheck`、`build`、`db:test`。

