# TESTING.md

## 基础验证命令

每个开发任务根据修改范围运行：

```bash
npm run typecheck
npm run lint
npm run build
npm run db:test
```

Prisma 专项检查只能使用：

```bash
npm exec -- prisma validate
npm exec -- prisma generate
npm run db:test
```

禁止使用 `node -e` 测试 Prisma。

## 现有专项测试

```bash
npm run test:rating-evidence
npm run test:batch-recovery
```

- `test:rating-evidence` 覆盖评级证据 taxonomy 的本地规则。
- `test:batch-recovery` 覆盖遗留运行任务恢复、恢复幂等、活动任务保护、成功结果保留和重试范围。

当前两个 TypeScript 测试脚本会出现 Node `MODULE_TYPELESS_PACKAGE_JSON` warning，这是已记录 Backlog，本任务不通过修改模块配置处理。

## 最近验证结果

最近一次只读审计验证结果：

- `npm run typecheck`：通过
- `npm run lint`：通过
- `npm run build`：首次因 dev server 文件锁失败，停止 dev server 后通过
- `npm run db:test`：通过，`Work count: 27`
- `npm run test:rating-evidence`：通过，存在 `MODULE_TYPELESS_PACKAGE_JSON` warning
- `npm run test:batch-recovery`：通过，存在 `MODULE_TYPELESS_PACKAGE_JSON` warning

## Browser 验证路由

核心页面修改后使用 Browser 验证：

- `/`
- `/import`
- `/works`
- `/works/new`
- `/works/[id]`
- `/analysis`
- `/experiments/import`
- `/settings`

最近一次只读审计中，上述页面均可打开，关键模块可见，无控制台错误。

## 当前测试缺口

- 端到端核心流程：导入、识别、评级、生成、封面、审核、导出完整链路。
- 批量任务中断恢复端到端场景：当前已有服务层专项测试，仍缺少真实浏览器创建任务、重启服务、再打开 `/analysis` 的自动化 E2E。
- Excel 和 ZIP 结构断言：工作表、列、长文本换行、ZIP 文件清单。
- 搜索 Provider 契约：字段归一化、限流、fallback 标记、错误摘要。
- OpenAI 失败和非法返回：failed / invalid UI 展示和不回退规则。
- 导出大数据量：多作品、多历史记录和大量封面文件下的耗时和内存。
- SSRF 边界：远程封面 URL 的 IPv6、link-local、重定向和异常 content-type。
