# ACCEPTANCE.md

## 数据库安全验收

稳定化验收必须包含以下检查：

```bash
npm run db:health
npm run test:database-path-guard
npm run test:database-isolation
npm run test:backup-create
npm run db:baseline
```

验收标准：

- `db:health` 只读通过，SQLite integrity check 为 `ok`。
- 全部写数据库测试均输出 `Database mode: isolated test database`。
- `test:database-isolation` 输出 `Development database unchanged`。
- `db:baseline` 输出到 Git 忽略的 `backups/baselines/`，不包含绝对路径、密钥或正文内容。
- `backup:create` 输出到 Git 忽略的 `backups/`，manifest 记录数据库哈希、integrity、uploads 摘要和排除项。
- 验收后 `git status` 不得包含 `prisma/test-*.db`、`backups/`、`.env`、`.env.local`、`uploads/` 或真实 SQLite 数据库文件。

历史 `Work count: 27` 到当前 `Work count: 20` 的差异仍不可追溯；验收不得把本切片描述为已恢复或解释缺失记录。

## 稳定化阶段验收条件

稳定化阶段验收不是继续增加功能，而是证明当前核心工作流可被真实业务安全试跑。

## 必须满足

- 核心流程可完整运行：导入或新增、识别、评级、生成、封面、审核、测试回流、洞察、导出。
- P0 任务通过或有明确阻断结论。
- 不泄露 API key、本地数据库路径、上传目录绝对路径或代理敏感信息。
- 批量任务中断可被识别，并能通过最小恢复策略处理或人工重试。
- Excel 和 ZIP 结构有自动测试覆盖。
- 主要页面经过 Browser 验证。
- 文档与代码当前行为一致。
- `npm run typecheck`、`npm run lint`、`npm run build`、`npm run db:test` 通过。
- 相关专项测试通过。

## 核心流程验收清单

- [ ] Excel / CSV 导入可预览、校验、入库。
- [ ] 手动新增作品可创建并进入详情页。
- [ ] 单本识别默认 Mock，不调用真实搜索。
- [ ] configured search 必须显式选择并确认成本。
- [ ] OpenAI 评级失败或 invalid 不覆盖当前采用评级。
- [ ] OpenAI 评级成功后必须人工采用才进入 `WorkRating`。
- [ ] 书名简介生成可保存结果。
- [ ] 封面评估、策略确认、原图换标题可运行。
- [ ] Image2 只允许单本手动触发。
- [ ] 最终审核字段可保存并刷新后保留。
- [ ] 多书名测试结果可导入并生成复盘。
- [ ] 效果洞察不自动覆盖最终采用结果。
- [ ] Excel 导出包含核心工作表和关键字段。
- [ ] ZIP 缺少封面时仍可导出。
- [ ] 批量任务失败项可查看和重试。
- [x] 批量任务中断可被识别：遗留 `running` / `pending` 会标记 `PROCESS_INTERRUPTED`，成功项保留，未完成项可手动重试。

## 验收输出

验收完成后应记录：

- 验收日期
- 使用数据范围
- 验收人
- 结论：通过 / 有条件通过 / 不通过
- 阻断问题
- 非阻断问题
- 需要产品负责人决定的问题
- 下一切片是否允许启动
## 单本 OpenAI 评级成本确认验收

- [ ] 单本真实 OpenAI 评级前会显示成本确认弹窗。
- [ ] 弹窗展示作品名、模型名、单本调用和可能产生费用。
- [ ] 取消确认不会发送评级请求。
- [ ] 确认按钮文案为“确认并调用 OpenAI”。
- [ ] API 缺少 `costConfirmed: true` 时返回 `COST_CONFIRMATION_REQUIRED`。
- [ ] 同一作品已有 `running` 评级时返回 `RATING_ALREADY_RUNNING`。
- [ ] 配置缺失、超时、限流、上游错误和非法响应都有可读提示。
- [ ] 失败或 invalid 不覆盖当前已采用评级。
- [ ] 历史成功评级仍可查看和采用。
- [ ] 测试和 Browser 验证不调用真实 OpenAI。
