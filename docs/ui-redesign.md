# UI 设计系统与产品体验重构

更新时间：2026-05-31

## 阶段 21 目标

阶段 21 使用 Image2 高保真概念稿驱动前端重构，将现有功能完整但分散的后台页面整理为结构统一、可扫描、流程明确的内容运营工作台。

## 设计原则

- Premium / 高端
- Calm / 安静克制
- Structured / 结构化
- Efficient / 高效率
- Explainable / 可解释
- Workflow-driven / 面向运营流程

## 页面骨架

- 固定左侧导航。
- 紧凑顶部工具栏。
- 统一浅灰背景和主内容宽度。
- 白色分层卡片、细边框和轻阴影。
- 移动端使用顶部横向导航，保证基础可用。

## 组件体系

统一组件位于 `src/components/ui/`：

- `AppShell`
- `SidebarNav`
- `TopBar`
- `PageHeader`
- `SectionCard`
- `StatCard`
- `MetricBar`
- `ProgressBar`
- `EmptyState`
- `ActionCard`
- `WorkflowStep`
- `PriorityBadge`
- `EvidenceTag`
- `DataPanel`

统一显示映射和 token 位于 `src/lib/ui/`。

## 颜色与状态规范

| 用途 | 颜色 |
| --- | --- |
| 主操作、运行中、当前选中 | 蓝色 |
| 成功、已采用、健康状态 | 绿色 |
| 风险、部分成功、待处理 | 橙色 / 琥珀色 |
| 失败、需修改、重绘风险 | 红色 |
| 中性、未配置、已跳过 | 灰色 |

## Image2 使用方式

- 概念稿 prompt：`docs/ui-redesign/phase21-image2-prompts.md`
- 素材索引：`docs/ui-redesign/phase21-mockup-index.md`
- 采用记录：`docs/ui-redesign/phase21-adoption-log.md`
- 素材目录：`docs/assets/ui-mockups/phase21/`

## 已完成页面

- 全局 App Shell
- Dashboard 运营工作台
- 作品导入页流程提示
- 作品列表紧凑化
- 单作品详情控制台
- 批量任务中心
- 测试结果导入流程提示
- 系统设置运行状态中心
- 无作品、无测试结果空状态素材

## 后续仍需优化

- 根据运营人员实际使用反馈微调信息密度。
- 逐步让更多详情模块复用统一 `SectionCard` 和 `DataPanel`。
- 在不增加复杂依赖的前提下优化移动端详情页导航。
- 如正式引入设计评审流程，可为关键页面保留更多 Image2 备选稿。

