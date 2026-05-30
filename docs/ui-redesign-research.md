# 阶段 21 UI 重构研究

更新时间：2026-05-31

## 参考资料

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Apple HIG: Color](https://developer.apple.com/design/human-interface-guidelines/color)
- [Apple HIG: Typography](https://developer.apple.com/design/human-interface-guidelines/typography)
- [Atlassian Design System Foundations](https://atlassian.design/foundations/)
- [Atlassian Design System Spacing](https://atlassian.design/foundations/spacing/)
- [Atlassian Design System Typography](https://atlassian.design/foundations/typography/)
- [Material UI](https://mui.com/material-ui/)
- [MUI System Spacing](https://mui.com/system/spacing/)
- [Carbon Design System 2x Grid](https://carbondesignsystem.com/elements/2x-grid/overview/)
- [Carbon Design System Data Table](https://carbondesignsystem.com/components/data-table/usage/)

## Apple 风格可借鉴点

- **克制留白**：不把每一块信息都做成强视觉卡片，用留白和层级建立节奏。
- **高级感**：使用中性背景、细边框、轻阴影和少量精准强调色，避免高饱和装饰堆叠。
- **明确层级**：标题、辅助说明、正文、状态和操作按钮需要有稳定优先级。
- **少量但精准的强调色**：颜色优先传达状态和交互，不依赖颜色单独表达含义。
- **强产品感和低噪声界面**：控制每屏视觉焦点数量，减少无意义装饰。

## 企业级后台可借鉴点

- **清晰的信息分组**：Atlassian 建议按相似性和邻近性分组，相关内容紧邻，跨模块信息拉开间距。
- **统一的状态色**：成功为绿色、运行中为蓝色、风险为橙色、失败为红色、中性状态为灰色。
- **可扫描的数据密度**：Carbon 数据表强调工具栏、行和批量操作的一致交互，适合高频运营工作。
- **强一致性的组件系统**：基础卡片、状态标签、进度条、空状态和页面标题应复用统一骨架。
- **渐进式披露复杂信息**：默认展示结论，长文本、证据和技术配置使用折叠区域。
- **更少点击、更短路径**：高频动作前置到页面头部或推荐下一步区域。

## 网格与间距结论

- Atlassian 和 Carbon 都以 8px 为基础单位。
- 本项目使用 `4 / 8 / 12 / 16 / 24 / 32` 的受控间距阶梯。
- 页面区域采用固定左侧导航、顶部工具栏和流式主内容区。
- 表单、数据列表和详情区采用 16px 基础内边距；页面区域之间使用 24px 或 32px。

## 本项目 UI 设计原则

1. **Premium / 高端**：中性色主导，强调色少而明确。
2. **Calm / 安静克制**：减少无意义色块、粗边框和强阴影。
3. **Structured / 结构化**：使用统一 App Shell、卡片、状态和间距。
4. **Efficient / 高效率**：高频操作前置，批量操作按需展开。
5. **Explainable / 可解释**：结论、证据、风险和下一步动作分层展示。
6. **Workflow-driven / 面向运营流程**：首页、详情页和空状态都明确提示下一步。

## 页面重构重点

- Dashboard：从统计卡片集合升级为运营工作台。
- 作品列表：提高扫描效率，压缩长文本，明确批量操作区。
- 作品详情：建立运营控制台，增加顶部摘要和 sticky section nav。
- 批量任务：强化任务列表、进度、状态和失败定位。
- 设置页：运营状态优先，技术配置二级披露，永不展示密钥。

