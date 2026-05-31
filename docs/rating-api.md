# LEGACY 规则评级文档

> 本页描述阶段 6 的历史规则评级接口，仅用于兼容排查。阶段 21.2 后，正式作品价值评级必须使用 OpenAI rating run，并由运营人员人工采用。旧规则评级统一标记为 `legacy_rules / 历史规则评级`，不得作为正式运营判断依据。

# 作品价值评级 API

当前评级来自本地规则引擎 `evaluateWorkRating`，不是 OpenAI，也不调用真实搜索 API。

## POST /api/works/[id]/rating

用途：根据作品基础信息和最近一次作品识别结果，计算作品价值评级并保存到 `WorkRating`。

如果作品没有识别结果，也允许评级。此时：

- `identification` 会按空结果处理。
- 评级置信度会降低。
- 风险项会包含“尚未进行作品识别，评级置信度较低”。

成功返回：

```json
{
  "success": true,
  "data": {
    "ratingId": "...",
    "rating": "B",
    "score": 68,
    "confidence": 0.75,
    "reasons": [],
    "risks": [],
    "evidence": [],
    "renameSuggestion": "recommended",
    "renameReason": "..."
  }
}
```

失败返回：

```json
{
  "success": false,
  "message": "...",
  "errors": []
}
```

## GET /api/works/[id]/rating

用途：读取作品最近一次评级结果。

如果没有评级结果：

```json
{
  "success": true,
  "data": null
}
```

如果有评级结果，会将 `reasonsJson`、`risksJson`、`evidenceJson` 解析为数组后返回。

## 后续计划

6D 会把评级结果接入作品详情页展示。当前阶段只提供后端 API。

## �׶� 15 ���䣺��ע�ֶβ���������

`Work.notes` / `remark` ����Ϊ��Ӫ����������ʹ�ã��ɰ������������ͷ��� prompt �������㡣

�����������治��ѱ�ע������Ϊ��Ʒ��ֵ�������ݣ�������Ӫ���۱�עֱ��Ӱ�� SABCD ������
