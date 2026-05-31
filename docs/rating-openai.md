# OpenAI 正式评级

## 当前评级链路审计结论

当前默认作品价值评级未调用 OpenAI，主要由本地 rules 逻辑生成。阶段 21.2 将改造为 OpenAI 全量评级。

阶段 21.2 开始前，系统存在两条会直接写入最终评级的本地规则链路：

- 单本作品：`POST /api/works/[id]/rating`
- 批量任务：`rating` step

两条链路都会调用 `evaluateWorkRating()`，并将结果直接写入 `WorkRating`。这不满足“最终作品价值评级只由 OpenAI 生成”的产品约束。

阶段 21.2 调整后：

- 本地规则引擎只保留为辅助校验、证据整理和历史兼容能力，不再写入新的正式评级。
- 每次 OpenAI 评级都会写入独立的 `WorkRatingRun` 历史记录。
- OpenAI 建议评级不会自动覆盖当前采用结果。
- 只有用户明确点击“采用该评级”后，系统才会将该运行结果投影到兼容表 `WorkRating`，供后续书名简介生成、导出和看板继续使用。
- 旧 `WorkRating` 记录视为“历史规则评级，仅供参考”。

## 评级输入

OpenAI 正式评级会聚合作品基础信息、最近一次作品识别、有效搜索证据、运营数据、最近封面评估、实验复盘摘要和人工补充证据。补充证据仅用于帮助模型判断，不会被本地规则直接换算为最终分数。

## OpenAI 输出 JSON

输出包含评级、分数、置信度、多书名建议、理由摘要、关键证据、风险、证据权重、缺失证据、运营建议、标题优化潜力和封面优化潜力。所有输出都必须通过严格 JSON schema 校验。

当前证据体系修正版 prompt 版本：`rating-openai-v3`。

```json
{
  "rating": "S|A|B|C|D",
  "score": 0,
  "confidence": 0,
  "renameSuggestion": "avoid|cautious|recommended|strongly_recommended",
  "reasonSummary": "string",
  "keyEvidence": ["string"],
  "riskNotes": ["string"],
  "evidenceWeighting": [
    {
      "source": "string",
      "type": "platform|ip|social|ranking|sales|author|cover|test|manual|other",
      "importance": "high|medium|low",
      "effect": "increase|decrease|neutral",
      "reason": "string"
    }
  ],
  "missingEvidence": ["string"],
  "operationAdvice": "string",
  "titleOptimizationPotential": "low|medium|high",
  "coverOptimizationPotential": "low|medium|high",
  "hasIpAdaptationEvidence": false,
  "hasSocialHeatEvidence": false,
  "hasAuthorInfluenceEvidence": false
}
```

## 人工补充证据

作品详情页可新增、查看和删除人工补充证据。重新评级会读取当前作品全部补充证据，并交给 OpenAI 综合判断。补充证据不由本地 rules 换算分数。

## 为什么不允许 rules fallback

作品价值评级会影响多书名策略、封面投入和后续资源安排。OpenAI 请求失败时回退 rules 会把弱规则结果伪装成正式评级，因此失败记录必须保留 `failed` 状态，不覆盖当前采用结果。

## 安全边界

- 不保存或展示 API key。
- 不提交 `.env` / `.env.local`。
- OpenAI 失败不静默回退 Mock 或 rules。
- 不自动批量调用 OpenAI。

## 作品价值评级与封面评级的边界

封面评分是独立视觉运营指标，不得作为作品价值评级扣分依据。评级快照只向 OpenAI 提供封面策略和说明，并明确标记“仅用于封面优化建议，不得用于作品价值评级扣分”。封面优化潜力仍可用于运营建议。

## 音频数据缺失不扣分原则

未检索到喜马拉雅、番茄畅听等平台的播放量、评论、订阅、付费、榜单数据，不等于作品表现差。缺失信息只进入 `missingEvidence`。只有导入数据或人工补充证据明确表明表现弱时，才可作为负面证据。

## 作品基础信息是权威源

导入表格或手动新增时录入的 `Work.title` 和 `Work.author` 是搜索匹配与正式评级的权威基准。评级快照会同时写入 `importedTitle`、`importedAuthor`、`titleForMatching`、`authorForMatching`、`titleForEvaluation` 和 `authorForEvaluation`。

`confirmedTitle` / `confirmedAuthor` 仅作为历史兼容信息保留，不再覆盖作品基础信息，也不是评级前置条件。需要修正书名或作者时，应编辑作品基础信息。

外部搜索结果中的作者不同，只能影响该搜索结果是否 matched、uncertain 或 rejected，不得降低作品价值评分。`Work.author` 缺失时可以降低搜索匹配置信度并提示补充，但不得直接降低作品价值评分。

## 搜索来源分级体系

| Tier | 来源 | 评级作用 |
| --- | --- | --- |
| 1 | 首发、官方、原始发行平台 | 最高权重 |
| 2 | 可信三方阅读和分发平台 | 高权重 |
| 3 | 有声书、广播剧平台 | 按作品类型提高权重 |
| 4 | 社媒、百科、门户新闻、明确 IP 证据 | 传播辅助证据 |
| 5 | 普通网页 | 低权重辅助 |
| 0 | 盗版、采集、侵权、SEO 聚合站 | 过滤，不进入评级 |

## 首发站点与官方来源清单

Tier 1 覆盖起点、创世、云起、红袖、潇湘、晋江、番茄小说、七猫、掌阅系、17K、书旗、咪咕、飞卢、磨铁系、塔读、黑岩、刺猬猫、长佩、豆瓣阅读、爱奇艺文学等首发或官方平台。未命中 Tier 1 只提示补充，不自动扣分。

## 三方平台来源清单

Tier 2 覆盖微信读书、QQ 阅读、得到、樊登、掌阅、七猫、手机百度、咪咕等可信分发平台。Tier 3 覆盖喜马拉雅、番茄畅听、QQ 音乐、酷狗、酷我、懒人听书、网易云音乐、猫耳 FM、克拉漫播、长佩等音频平台。

## 社媒热度与 IP 改编来源

微博、抖音、小红书、快手、可信门户新闻、百度百科等可以归入来源分类，但来源分类只是本地预处理和诊断。只有明确出现影视化、动画化、广播剧、漫画、有声书、出版、获奖、榜单或可验证指标时，OpenAI 才能将其判断为正式传播证据。爱奇艺文学不等于爱奇艺影视改编，腾讯动漫不等于腾讯视频改编，网易云音乐内容不等于门户新闻热度。

## 本地证据 Gate 的边界

本地算法只做机械清洗、域名归一、来源分级、同站点去重、盗版过滤、相关性初筛、数量截断和诊断信息。历史 `ipEvidence`、`heatEvidence`、`valueSignalScore` 仅保留为 `preliminarySignals` 或诊断字段，不进入正式 accepted evidence，也不能直接写入最终关键证据。

正式 IP、影视、社媒热度、平台热度和作者影响力标签由 OpenAI 根据原始标题、摘要、URL、来源和人工补充材料判断。

## 盗版 / 采集站过滤规则

来源命中盗版、采集、聚合、免费全文、笔趣、无弹窗、TXT 下载等模式时归入 Tier 0。Tier 0 不进入 OpenAI 输入、关键证据和分数，只在折叠调试信息中统计。

## 同站点只采用一条规则

规范化证据按相关性排序。同一 domain、platform 或 `sourceGroup` 仅保留最相关的一条结果，其余记录为重复过滤。

## 作品分类 contentType 对搜索和评级的影响

- `web_novel`：网文，优先首发站点和阅读分发平台。
- `ebook`：出版电子书，优先电子书和可信阅读平台。
- `audiobook`：有声小说，优先音频平台。
- `audio_drama`：广播剧，优先猫耳 FM、克拉漫播、网易云音乐等平台。

## OpenAI 无效输出判断规则

出现以下情况会将 run 保存为 `invalid`，且不会覆盖当前采用评级：没有明确原始证据却声明 IP、社媒热度或作者影响力标签；封面低分扣作品价值分；证据缺失被当作默认扣分项；外部作者差异被当作作品价值扣分项；引用盗版采集站；引用已过滤结果；将平台集团关系误判为 IP 改编；有 Tier 1 / Tier 2 高可信证据时仍主要依赖普通网页。

## 成本控制

- 单本评级必须由用户主动触发。
- 批量评级必须勾选成本确认。
- 批量评级有单次作品数量上限，避免误触发大量 OpenAI 请求。
- 配置缺失或 OpenAI 调用失败时，不会回退到本地规则评级。

## 历史与采用

`WorkRatingRun` 会记录模型、prompt 版本、输入快照、结构化输出、运行状态和错误摘要。成功运行后，用户可以在作品详情页人工采用某一条历史结果。系统保留历史记录，不自动删除旧结果。

## API

- `POST /api/works/[id]/rating/run`
- `POST /api/works/[id]/rating/rerun`
- `POST /api/works/[id]/rating/runs/[runId]/adopt`
- `GET /api/works/[id]/rating/runs`
- `GET /api/works/[id]/rating-supplements`
- `POST /api/works/[id]/rating-supplements`
- `DELETE /api/works/[id]/rating-supplements/[supplementId]`

## OpenAI 失败处理

JSON 解析失败、结构校验失败、配置缺失或 OpenAI 请求失败都会保存 `failed` 运行记录。失败不会覆盖当前采用评级，也不会触发 rules fallback。

## 阶段 21.3C：invalid 提示与 legacy rules 边界

OpenAI 评级 run 为 `invalid` 或 `failed` 时，作品详情页展示运营可读中文提示，不默认展示大段原始 JSON。提示会明确说明：当前已采用评级不会被覆盖；可以重新生成评级；也可以补充人工证据后重新评级。

典型 invalid 包括：将爱奇艺文学误判为影视 / IP，将腾讯动漫误判为腾讯视频影视化，将网易云音乐误判为门户热度，将缺失音频数据或封面评分作为作品价值减分项，以及 `keyEvidence` 引用了 rejected 或 uncertain 证据。

阶段 21.2 后，正式作品价值评级来源为 OpenAI rating run。旧 rules 评级仅保留为 `legacy_rules` 历史兼容和诊断能力，不作为正式运营判断依据。OpenAI 失败或 invalid 时不会 fallback 到 `legacy_rules`。

## 阶段 21.3C：搜索结果理解与证据分区

OpenAI 评级输入会接收经过本地机械预处理的真实搜索结果。每条结果包含 `resultId`、标题、摘要、URL、域名、来源、来源等级、原始排序和 `preliminarySignals`。`preliminarySignals` 只是待核验诊断，不是正式证据。

OpenAI 必须逐条输出 `searchResultAnalysis`，并将结果分区为：

- `acceptedEvidence`：可以参与作品价值评级的已采信证据。
- `uncertainEvidence`：只能影响置信度或风险提示，不得作为核心评级依据。
- `rejectedEvidence`：不得影响评级。
- `missingEvidence`：默认 `shouldPenalize=false`，只提示补充信息。
- `evidenceTags`：每个 `true` 标签都必须能追溯到 `acceptedEvidence`。

服务端会拒绝以下结果：将 rejected / uncertain 证据作为核心依据；Tier 0、盗版或聚合来源参与评级；缺失证据默认扣分；封面低分扣作品价值分；外部搜索作者差异扣分；仅凭平台名或集团关系推断 IP、影视化或门户热度。

完整结构保存于 `WorkRatingRun.rawResponseJson`，运营页面只展示证据分区数量、标签摘要和可读错误，不默认展示大段原始 JSON。
