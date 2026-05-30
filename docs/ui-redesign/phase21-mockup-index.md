# 阶段 21 UI 概念稿索引

更新时间：2026-05-31

所有素材均由 Image2 生成并保存到仓库。生成图用于设计方向参考，实际产品文案和数据以代码为准。

| 页面 | 文件路径 | 用途 | 已采用 | 对应实现页面 |
| --- | --- | --- | --- | --- |
| App Shell | `docs/assets/ui-mockups/phase21/app-shell/app-shell-final.png` | 全局侧栏、顶栏、背景层级 | 是 | `src/app/layout.tsx` |
| Dashboard | `docs/assets/ui-mockups/phase21/dashboard/dashboard-final.png` | 首页运营工作台 | 是 | `src/app/page.tsx` |
| 作品导入 | `docs/assets/ui-mockups/phase21/import/import-final.png` | 四阶段导入工作流 | 是 | `src/app/import/` |
| 作品列表 | `docs/assets/ui-mockups/phase21/works-list/works-list-final.png` | 紧凑列表、筛选、批量操作 | 是 | `src/app/works/` |
| 单作品详情 | `docs/assets/ui-mockups/phase21/work-detail/work-detail-final.png` | 运营控制台、sticky section nav | 是 | `src/app/works/[id]/` |
| 批量任务中心 | `docs/assets/ui-mockups/phase21/batch-jobs/batch-jobs-final.png` | 双栏任务控制台 | 是 | `src/app/analysis/` |
| 测试结果导入 | `docs/assets/ui-mockups/phase21/experiment-import/experiment-import-final.png` | 复盘数据导入工作流 | 是 | `src/app/experiments/import/` |
| 系统设置 | `docs/assets/ui-mockups/phase21/settings/settings-final.png` | 运行状态中心 | 是 | `src/app/settings/` |
| 空状态：无作品 | `docs/assets/ui-mockups/phase21/empty-states/no-works-final.png` | 首页或列表无数据引导 | 是 | `src/app/page.tsx`, `src/app/works/` |
| 空状态：无测试结果 | `docs/assets/ui-mockups/phase21/empty-states/no-experiment-results-final.png` | 复盘入口引导 | 是 | `src/app/works/[id]/work-experiment-panel.tsx` |

