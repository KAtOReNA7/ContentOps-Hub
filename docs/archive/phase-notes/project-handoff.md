# 历史归档，不再作为当前事实源

本文档保留历史阶段交接信息。当前真实状态请查看 `../../CURRENT_STATUS.md`，正式文档导航请查看 `../../PRODUCT.md`、`../../WORKFLOWS.md`、`../../ARCHITECTURE.md`。

# 项目交接说明

更新时间：2026-05-30

## 一句话概览

本项目是“番茄畅听多书名运营辅助工具”的本地优先 MVP，用于把有声书作品从导入、识别、评级、书名简介生成、封面处理、人工审核、多书名测试复盘推进到 Excel / ZIP 交付。

当前仓库：

```text
https://github.com/KAtOReNA7/ContentOps-Hub.git
```

当前分支：

```text
main
```

阶段 19.2 本地功能基线提交：

```text
8c6787a feat: improve batch progress and search provider flow
```

## 当前进度

当前已完成到阶段 20 开发侧准备，进入完整交付验收。

### 已完成

- 阶段 1-4：环境检查、项目骨架、数据库模型、Excel / CSV 批量导入
- 阶段 5：Mock 作品识别、候选证据和人工确认
- 阶段 6：SABCD 作品价值评级
- 阶段 7-8：Mock / OpenAI 书名简介文本生成
- 阶段 9：封面资产、远程封面 URL、Mock 封面评估和处理策略确认
- 阶段 10：Excel 导出
- 阶段 11：原图换标题 / 版式优化
- 阶段 12：ChatGPT Image2 单作品封面重绘
- 阶段 13：人工审核状态流和最终采用结果
- 阶段 14：运营看板和页面定位优化
- 阶段 15：手动新增单本作品和业务作品 ID
- 阶段 16：搜索 provider 适配层、证据准入门槛和评级可信度优化
- 阶段 17：批量任务中心 V1 和批量 provider 选择
- 阶段 17.2：作品导入填写规则、模板和校验增强
- 阶段 18：多书名测试结果导入和运营复盘
- 阶段 18.1：测试结果模板、填写规则和校验增强
- 阶段 19：效果回流洞察和评分校准
- 阶段 19.1：首页、详情页、列表页、批量任务、设置页和多 Sheet Excel 导出体验清理
- 阶段 19.2：批量任务轮询进度弹窗、真实搜索 provider 入口和限流退避配置
- 阶段 20：验收清单、验收报告模板、脱敏样例、已知问题、路线图和低风险体验加固

## 核心工作流

1. 导入 Excel / CSV，或手动新增单本作品。
2. 运行作品识别，查看候选和搜索证据，必要时人工确认身份。
3. 运行 SABCD 评级。
4. 生成书名、简介和封面 Prompt，可选 Mock 或 OpenAI 文本 provider。
5. 上传封面或使用导入的远程封面 URL。
6. 运行封面评估并人工确认策略：
   - `keep_and_replace_title`
   - `keep_and_optimize_layout`
   - `redraw_cover`
7. 对前两类策略运行原图换标题；对 `redraw_cover` 按需手动调用 Image2。
8. 保存最终采用书名、简介、封面和审核信息。
9. 导入多书名测试结果，查看复盘和效果回流洞察。
10. 导出 Excel 或 ZIP 交付包。

## 技术栈

- Next.js App Router
- TypeScript
- Tailwind CSS
- SQLite
- Prisma 6.19.3
- xlsx
- sharp
- OpenAI SDK
- socks-proxy-agent / undici / node-fetch

## 核心数据模型

- `Work`：作品基础信息、审核状态和最终采用结果
- `WorkIdentification`：识别结果、人工确认、搜索 query、证据和风险
- `WorkRating`：评级、分数、理由、证据和多书名建议
- `WorkTitleIntroGeneration`：书名、简介和封面 Prompt
- `CoverAsset`：本地上传或远程 URL 封面资产
- `WorkCoverEvaluation`：封面评估和人工策略确认
- `WorkCoverRender`：原图换标题和 Image2 重绘结果
- `BatchJob` / `BatchJobItem`：本地顺序批量任务
- `WorkExperimentResult` / `WorkExperimentReview`：多书名测试数据和复盘
- `WorkFeedbackInsight`：效果回流、评分校准和策略标签

## 导出结构

Excel 保留原有 `作品运营建议` 总表，同时提供：

- `运营总览`
- `识别与评级详情`
- `书名简介方案`
- `封面处理`
- `测试复盘`
- `效果回流`

ZIP 交付包包含 Excel 和可读取到的最终采用封面。缺少封面不会阻断导出。

## 本地运行

```bash
npm install
npm run db:push
npm run dev
```

常用检查：

```bash
npm exec -- prisma validate
npm exec -- prisma generate
npm run db:test
npm run typecheck
npm run lint
npm run build
```

禁止使用 `node -e` 测试 Prisma。

## 安全边界

- 不提交 `.env` / `.env.local`
- 不提交本地 SQLite 数据库
- 不提交 `uploads/` 下真实图片
- 不把 API key 写进代码、文档或前端
- OpenAI 文本和图片能力均由用户主动触发
- 默认不批量生成图片
- 默认搜索 provider 为 Mock
- 不使用 destructive Prisma 命令

## 当前限制

- 真实搜索 provider 已有适配层，但具体厂商接入仍需按业务选型完善。
- 批量任务中心使用本地顺序执行，不支持复杂队列、暂停、恢复和并发控制。
- 效果回流使用可解释规则，不做机器学习训练和复杂统计显著性检验。
- 远程封面不在 ZIP 导出阶段强制下载。

## 下一步建议

先执行一次完整交付验收，再根据运营反馈决定下一阶段：

1. 按照 `docs/acceptance-checklist.md` 使用脱敏样例完成导入到人工审核闭环。
2. 使用测试结果模板导入一组对照数据，检查复盘和效果洞察。
3. 检查 Excel 原始总表和 6 个分类工作表。
4. 检查 ZIP 缺少最终封面时是否仍能正常交付。
5. 明确真实搜索服务厂商后，再补充对应 provider 映射。

## 推荐阅读顺序

1. `README.md`
2. `AGENTS.md`
3. `docs/CURRENT_STATUS.md`
4. `docs/project-handoff.md`
5. `docs/progress.md`
6. `prisma/schema.prisma`
7. `docs/import-file-rules.md`
8. `docs/experiment-import-rules.md`
9. `docs/batch-jobs.md`
10. `docs/export-excel.md`
11. `docs/feedback-insights.md`
12. `docs/acceptance-checklist.md`
13. `docs/known-issues.md`
14. `docs/roadmap.md`
