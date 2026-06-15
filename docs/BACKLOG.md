# BACKLOG.md

## P0

- 文档与事实收敛。已批准，本切片执行。
- 最小批量任务恢复能力。已批准作为下一切片：识别重启后的 running / pending 状态，并提供可恢复、可失败归档或可重试的最小路径。
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
- 设置页增加更明确的运行状态说明，但不展示敏感值。
- 交付验收报告模板与 `ACCEPTANCE.md` 对齐。
- 对历史文档增加更完整的归档索引。
- 清理既有历史文档的混合编码问题，例如 `docs/rating-api.md`。

## 待验证

- 使用脱敏样例完整跑通导入到 ZIP 交付。
- 使用少量真实业务数据验证搜索证据、OpenAI 评级和导出字段。
- 浏览器下载型 API 的验证方式：Browser 可能阻止直接打开 Excel / ZIP 下载链接，需要配合 HTTP 或下载事件验证。
- `npm run test:rating-evidence` 的 `MODULE_TYPELESS_PACKAGE_JSON` warning 仅记录，不在本切片处理。

## 待产品决定

- 品牌称呼统一为“番茄畅听”还是“番茄畅畅听”。
- 单本 OpenAI 评级成本确认的最终文案和交互阻断强度。
- 批量任务恢复的产品语义：自动续跑、标记失败、人工恢复或仅提示。
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
