# AGENTS.md

## 项目说明

本项目是“番茄畅畅听多书名运营辅助工具”。

当前阶段目标是先完成 MVP，不要提前做复杂功能。

## 后续开发规则

1. 每个阶段完成后必须运行：
   - `npm run typecheck`
   - `npm run lint`
   - `npm run build`
   - `npm run db:test`
2. 每条命令最多等待 60 秒，超过就停止并记录 timeout。
3. 禁止使用 `node -e` 测试 Prisma。
4. Prisma 连接测试只能使用：
   - `npm exec -- prisma validate`
   - `npm exec -- prisma generate`
   - `npm run db:test`
5. 不要随意升级 Prisma，不要改回 Prisma 7。
6. 不要在没有说明原因的情况下修改 `prisma/schema.prisma`。
7. 不要接真实搜索 API，除非当前阶段明确要求。
8. 不要接真实 OpenAI API，除非当前阶段明确要求。
9. 不要把 API key 写入代码。
10. 如果需要新增依赖，先说明新增依赖名称和用途。
11. 每个阶段完成后更新 `docs/progress.md`。
12. 如果遇到命令卡住，不要无限排查，先保存状态并输出恢复报告。
13. 不要删除已完成代码，除非明确说明原因并得到确认。
