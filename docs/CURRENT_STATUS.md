# 当前项目状态

更新时间：2026-06-01

## 当前阶段

阶段 21.3D 已完成：作品基础信息仍是搜索匹配与 OpenAI 评级权威源，OpenAI 评级证据分区、人工补充证据、运行历史和人工采用体验已整理为运营可复核页面。

## 阶段 21.3B：作品基础信息权威源与评级证据边界

- 导入表格或手动新增时录入的 `Work.title` / `Work.author` 已明确为搜索匹配和 OpenAI 评级权威源。
- `confirmedTitle` / `confirmedAuthor` 已降级为历史兼容信息，不再覆盖作品基础信息，也不是评级前置条件。
- 本地 evidence gate 只做标准化、来源分级、去重、盗版过滤、相关性初筛和诊断。
- 本地 `ipEvidence`、`heatEvidence`、`valueSignalScore` 仅作为待核验初步信号，不作为正式 IP 或热度事实。
- OpenAI Prompt 已明确禁止根据平台名或集团关系推断 IP 改编、影视化、社媒热度或作者影响力。
- OpenAI invalid 校验已覆盖平台误判、缺失证据扣分、外部作者差异扣分、封面低分扣分、Tier 0 来源和已过滤证据引用。
- 阶段 21.3C 已补强 OpenAI `invalid` / `failed` 运营提示：页面使用中文说明未采用原因，并明确当前评级不会被覆盖。
- 旧规则评级已标记为 `legacy_rules / 历史规则评级`，仅保留历史兼容和诊断用途，不参与阶段 21.2 之后的正式评级。
- 阶段 21.3C 已将搜索结果语义理解交给 OpenAI：输出逐条分析、accepted / uncertain / rejected evidence、missing evidence 和可追溯 evidence tags。
- 本地 evidence gate 只做机械预处理和初步诊断，`preliminarySignals` 不代表正式 IP、热度或作者影响力结论。
- 阶段 21.3D 已在作品详情页展示当前采用 OpenAI 评级、待采用建议、invalid / failed 提示、证据分区、证据标签摘要、人工补充证据和最近 10 条 OpenAI 评级历史。
- 人工补充证据支持新增、删除、链接校验和重要程度标记；重新评级时进入 OpenAI 快照，但生成结果仍需人工采用。
- `missingEvidence` 在页面明确标记为补充建议，不等于扣分；`uncertainEvidence` / `rejectedEvidence` 默认折叠，不作为核心价值依据。

当前仓库：

```text
https://github.com/KAtOReNA7/ContentOps-Hub.git
```

阶段 19.2 本地功能基线提交：

```text
8c6787a feat: improve batch progress and search provider flow
```

## 已完成能力

- Excel / CSV 作品导入，支持预览、校验、重复检测和入库
- 手动新增单本作品，支持业务作品 ID、封面 URL 和本地封面上传
- 作品列表、筛选、分页、批量勾选和作品详情页
- Mock-first 作品识别、搜索证据保存、相关性准入门槛和人工确认
- OpenAI SABCD 作品价值评级，支持历史记录、失败留痕、人工采用和补充证据
- OpenAI 评级证据分区复核，支持 accepted / uncertain / rejected evidence、missing evidence 和 evidenceTags 展示
- Mock / OpenAI 书名简介文本生成，OpenAI 仅用户主动选择时调用
- 封面上传、导入封面 URL、预览、Mock 评估和策略人工确认
- 原图换标题 / 版式优化，输出 1:1 和 3:4 封面
- ChatGPT Image2 单作品封面重绘，默认不批量调用
- 人工审核状态流和最终书名、简介、封面采用结果
- 单本、全部、筛选、勾选 Excel 导出
- Excel + 已有最终封面 ZIP 交付包
- 批量任务中心 V1：识别、评级、书名简介生成、封面评估
- 批量评级固定使用 OpenAI，必须人工确认成本，单次最多 10 部，已有成功评级默认跳过
- 多书名测试结果导入和运营复盘
- 效果回流洞察和评分校准
- 首页运营看板、详情页处理摘要、紧凑列表、状态标签和设置页运营视图
- Excel 导出分类工作表：运营总览、识别与评级详情、书名简介方案、封面处理、测试复盘、效果回流
- 批量任务创建后弹出轮询式进度窗口，展示总数、完成数、成功、失败和跳过数量
- 单本和批量识别均支持显式选择 Mock 或 configured search
- 批量任务分别保存识别搜索 provider 和书名简介生成 provider，避免混淆
- 阶段 20 验收资料：验收清单、报告模板、脱敏样例、已知问题和路线图
- 设置页交付健康检查，覆盖数据库配置、上传目录、搜索服务和 OpenAI 文本配置
- Excel 长文本列换行和更紧凑的交付阅读体验
- 依赖安全修复：`npm audit` 已归零，PostCSS 和 SheetJS 均使用修复版本
- Image2 高保真 UI 概念稿覆盖 App Shell、Dashboard、导入、列表、详情、批量任务、设置和空状态
- 全局 App Shell、设计 token、中文状态映射和统一基础组件
- Dashboard 运营工作台、紧凑作品列表、单作品运营控制台和运行状态中心

## 当前边界

- 真实搜索保留 provider 适配层，默认仍为 Mock；具体厂商接入需按业务选择继续完善。
- 图片生成只允许单作品手动触发，不提供默认批量生成。
- 批量任务中心使用本地顺序执行，不引入 Redis、BullMQ 或后台 worker。
- 批量任务异步执行依赖当前 Node 进程持续运行，服务重启不会自动恢复未完成任务。
- 效果回流使用可解释规则，不做机器学习训练和复杂统计显著性检验。
- 效果洞察不会自动覆盖最终采用结果。

## 下一步建议

优先按照 `docs/acceptance-checklist.md` 进行一次完整交付验收，并重点验证阶段 21 的运营体验：

1. 导入作品并完成识别、评级、书名简介生成、封面评估和人工审核。
2. 导入多书名测试结果，检查复盘和效果回流洞察。
3. 导出 Excel，检查原始总表和 6 个分类工作表。
4. 导出 ZIP，确认最终封面缺失时不会阻断整个交付包。
5. 根据实际运营团队反馈，再决定是否接入具体真实搜索服务。
6. 检查左侧导航、详情 sticky section nav、批量任务进度颜色和空状态引导。

验收问题统一记录到 `docs/acceptance-report-template.md` 的副本中。路线规划见 `docs/roadmap.md`。

## 禁止事项

- 不要默认批量调用 OpenAI
- 不允许 OpenAI 评级失败后静默回退 rules
- 不要默认批量生成图片
- 不要提交 `.env` / `.env.local`
- 不要把 API key 写入代码或前端
- 不要提交 `uploads/` 下真实图片
- 不要提交本地 SQLite 数据库
- 不要在没有 fallback 的情况下替换 Mock provider
