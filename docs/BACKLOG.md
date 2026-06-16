# BACKLOG.md

## P0 数据基线风险

- 历史 `Work count: 27` 到当前 `Work count: 20` 的差异仍无法追溯。本项目不宣称已经找回、解释或补造缺失记录。
- 已建立测试库隔离、基线快照和本地备份能力；后续真实业务验收前仍建议先执行一次人工备份和 `npm run db:baseline`。
- 自动测试写入 `dev.db` 已列为禁止事项；任何新增写库测试必须先走隔离测试库。

## 已完成稳定化事项

- 单本 OpenAI 评级成本确认、配置预检、错误脱敏和单进程并发锁已完成。
- 批量任务中断恢复已完成，未完成项进入可重试状态，不自动续跑收费 Provider。
- 写数据库专项测试已迁移到 `prisma/test-*.db`，并新增 `npm run test:database-isolation` 验证 `dev.db` 逻辑摘要不变。

## 下一步高优先级候选

- Excel 和 ZIP 结构自动验收。
- 导入到导出的端到端 Browser 自动化基线。
- 远程封面下载和 ZIP 打包的 SSRF / 路径泄露防护。

## P0

- 文档与事实收敛。已批准，本切片执行。
- 单本 OpenAI 评级增加显式成本确认。已批准。
- Excel 和 ZIP 结构自动测试。
- 核心流程端到端验收脚本或 Browser 验收清单。

## P1

- OpenAI failed / invalid UI 回归测试。
- 搜索 fallback 标记和错误摘要测试。
- 远程封面 SSRF 边界补强：IPv6、link-local、重定向链、异常 content-type。
- 导出大数据量性能检查。
- Windows dev server / Prisma engine 文件锁恢复说明保持更新。

## P2

- 批量任务诊断日志和任务摘要可读性优化。
- 批量任务中断恢复已具备最小能力；后续可评估更细的诊断日志、恢复审计记录和批量重试入口。
- 设置页增加更明确的运行状态说明，但不展示敏感值。
- 交付验收报告模板与 `ACCEPTANCE.md` 对齐。
- 对历史文档增加更完整的归档索引。
- 清理既有历史文档的混合编码问题，例如 `docs/rating-api.md`。

## 待验证

- 使用脱敏样例完整跑通导入到 ZIP 交付。
- 使用少量真实业务数据验证搜索证据、OpenAI 评级和导出字段。
- 浏览器下载型 API 的验证方式：Browser 可能阻止直接打开 Excel / ZIP 下载链接，需要配合 HTTP 或下载事件验证。
- `npm run test:rating-evidence` 和 `npm run test:batch-recovery` 的 `MODULE_TYPELESS_PACKAGE_JSON` warning 仅记录，不在本切片处理。

## 待产品决定

- 品牌称呼统一为“番茄畅听”还是“番茄畅畅听”。
- 单本 OpenAI 评级成本确认的最终文案和交互阻断强度。
- 批量任务恢复后是否需要批量重试入口或更强提示文案。当前已确定：不自动续跑，只标记中断并由用户主动重试。
- 哪些测试数据可作为稳定化验收的标准样本。

## 延期

- 真实搜索 Provider 接入。
- 远程封面缓存进 ZIP。
- OpenAI 视觉评分。
- 默认批量图片生成。
- Redis、BullMQ、独立 worker 或复杂队列。
- 机器学习训练和复杂统计显著性检验。
- 多账号权限和审计日志。

## 删除候选

- `AnalysisResult` 早期 mock 分析模型。
- `src/lib/services/analysis-service.ts` 早期批量 mock 分析链路。
- 旧 rules 正式评级入口和相关展示文案。

删除候选仅标记，不在稳定化文档切片中删除。
## 已完成稳定化切片：单本 OpenAI 评级成本确认

- 单本真实 OpenAI 评级已增加前端确认弹窗和 API 层 `costConfirmed: true` 校验。
- 已增加 `RATING_ALREADY_RUNNING` 最小并发保护。
- 已增加单本评级错误码归一和脱敏响应。
- 已增加 `npm run test:single-rating-cost` 专项测试。

后续仍可继续细化：

- 将单本 OpenAI 评级成本确认纳入端到端 Browser 自动断言。
- 增加调用成本统计和操作日志。
