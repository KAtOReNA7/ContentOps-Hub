# 原图换标题 / 版式优化 V1

更新时间：2026-05-24

## 目标

阶段 11 支持在不调用图片生成 API、不重绘封面的前提下，基于已有封面图程序化生成新版标题封面。

适用策略：
- `keep_and_replace_title`：保留原封面主体，仅替换标题层。
- `keep_and_optimize_layout`：保留原封面主体，增加标题底板和基础版式优化。

不适用策略：
- `redraw_cover`：该策略需要后续进入重新绘制封面，本阶段不处理。

## 数据结构

新增 `WorkCoverRender`，保存：
- `workId`
- `coverAssetId`
- `titleIntroGenerationId`
- `titleText`
- `strategy`
- `outputRatio`
- `outputPath`
- `outputUrl`
- `status`
- `errorMessage`
- `createdAt`

生成图片文件保存在：

```text
uploads/cover-renders/{workId}/
```

`uploads/` 已被 Git 忽略，不应提交真实生成图片。

## API

### POST /api/works/[id]/cover/render

基于作品当前封面生成新版标题封面。

请求体：

```json
{
  "titleText": "新版标题",
  "strategy": "keep_and_optimize_layout",
  "ratios": ["1:1", "3:4"]
}
```

返回生成结果列表，每个结果包含预览地址。

### GET /api/works/[id]/cover/render

读取最近生成的封面结果，并返回可选的新书名列表。

### GET /api/cover-renders/[id]/file

读取生成后的 PNG 图片。

## 图片处理方式

V1 使用 `sharp` 做程序化合成：
- 读取本地上传封面或远程 URL 封面。
- 居中裁切到目标比例。
- 生成标题文字层。
- 自动按字符数换行。
- 根据标题长度自动缩放字号。
- 添加底部遮罩和标题背景。
- 输出 `1:1` 和 `3:4` PNG。

## 限制

- 不调用 OpenAI 图片能力。
- 不接图片生成 API。
- 不重绘主体画面。
- 不做复杂模板系统。
- 不做 OCR，不自动擦除原封面旧标题。
- 远程封面读取沿用安全限制：仅 http/https，阻止 localhost 和常见内网 IP，限制 timeout、MIME 和大小。

## 手动测试

1. 运行 `npm run dev`。
2. 进入作品详情页。
3. 确认作品已有封面。
4. 确认封面策略为 `keep_and_replace_title` 或 `keep_and_optimize_layout`。
5. 选择一个已生成的新书名，或手动输入标题。
6. 点击“基于原封面生成新版封面”。
7. 确认 `1:1` 和 `3:4` 图片可预览。
8. 点击下载，确认图片可下载。
9. 刷新页面，确认生成记录仍可查看。
10. 确认 Excel 导出仍可正常使用。
