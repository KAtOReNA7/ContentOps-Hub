# OpenAI 文本生成 Adapter

更新时间：2026-05-24

## 作用

OpenAI 文本生成 Adapter 用于把书名、简介和封面 prompt 的生成从 Mock 规则引擎切换到 OpenAI Responses API。

Adapter 输出结构必须兼容 `TitleIntroGenerationResult`，因此生成结果可以继续复用现有保存逻辑。

## 环境变量

需要在本地 `.env` 中配置：

```env
OPENAI_API_KEY=""
OPENAI_TEXT_MODEL=""
OPENAI_TIMEOUT_MS=90000
OPENAI_TITLE_INTRO_MAX_OUTPUT_TOKENS=3000
OPENAI_PROXY_URL=
```

- `OPENAI_API_KEY`：OpenAI API key，不得提交到 Git。
- `OPENAI_TEXT_MODEL`：文本生成模型，由调用方配置，不在代码中固定为唯一模型。
- `OPENAI_TIMEOUT_MS`：OpenAI 请求超时时间，默认建议 `90000`。
- `OPENAI_TITLE_INTRO_MAX_OUTPUT_TOKENS`：书名/简介生成的最大输出 token，默认建议 `3000`。如果页面返回 `Unterminated string in JSON`，通常说明结构化 JSON 被截断，应增大该值或让输出更短。
- `OPENAI_PROXY_URL`：可选代理地址，支持 `http://`、`https://`、`socks5://`、`socks5h://`。

如果任一变量缺失，OpenAI Adapter 会抛出明确错误。API 在 `provider=openai` 时会把该错误转换为结构化 JSON 返回。

## 8B API 切换

`POST /api/works/[id]/title-intro` 已支持 provider 切换：

- 不传 provider：默认 `mock`。
- `provider=mock`：使用 Mock 规则引擎。
- `provider=openai`：调用 OpenAI 文本生成 Adapter。

OpenAI 只会在请求体明确传入 `{ "provider": "openai" }` 时调用。现有作品详情页按钮没有传 provider，因此默认仍走 Mock。

真实调用前需要配置 `.env`，并确认 API key 没有写入代码、日志、返回值或数据库。

## 8C 页面入口

作品详情页的“书名和简介优化 Mock”区域已支持生成来源选择：

- 默认选择 `Mock 规则引擎`。
- 用户主动选择 `OpenAI 文本生成` 后，点击生成按钮才会调用 OpenAI provider。
- API key 只应放在服务端环境变量中。
- 前端不会读取、展示或提交 API key。
- 如果 `OPENAI_API_KEY` 或 `OPENAI_TEXT_MODEL` 缺失，页面会展示后端返回的结构化错误。

## 结构化输出

OpenAI 返回必须通过 JSON Schema 和运行时校验后才能作为 `TitleIntroGenerationResult` 使用。

校验重点：

- `shouldGenerateVariants` 必须是 boolean。
- `strategy` 必须是合法枚举。
- `titleVariants` 必须是数组。
- `introVariant` 必须是对象。
- `coverPrompts` 必须是数组，且 `ratio` 只能是 `1:1` 或 `3:4`。
- `risks` / `evidence` 必须是数组。
- 字段缺失或类型错误会抛出明确错误。

## 当前限制

- 当前不生成图片。
- 当前不接封面图片 API。
- 当前不默认调用 OpenAI，避免无意消耗 API 费用。

## 本地配置

如需手动测试 OpenAI provider，请在项目根目录创建或更新 `.env.local`：

```env
OPENAI_API_KEY="你的 OpenAI API key"
OPENAI_TEXT_MODEL="你的文本生成模型"
OPENAI_TIMEOUT_MS=90000
OPENAI_PROXY_URL=socks5h://127.0.0.1:10808
```

修改 `.env.local` 后需要重启 `npm run dev`，否则 Next.js 开发服务可能仍使用旧环境变量。

注意事项：

- Mock 是默认 provider。
- OpenAI 只有用户在页面主动选择“OpenAI 文本生成”并点击生成时才会调用。
- OpenAI 调用会产生 API 费用。
- 不要提交真实 API key。
- API key 只应放在服务端环境变量中。
- 前端不会读取或展示 API key。
- 如果缺少 `OPENAI_API_KEY` 或 `OPENAI_TEXT_MODEL`，页面会显示后端返回的明确错误。
- 如果出现 timeout，页面会显示当前 timeout 毫秒数和排查建议。
- 如果本机使用 v2rayN，SOCKS 代理常见示例为 `socks5h://127.0.0.1:10808`。
- 如果本机有 HTTP 代理，可使用类似 `http://127.0.0.1:10809`。

当前 OpenAI 文本生成只生成：

- 新书名建议。
- 新简介。
- 封面 prompt。

当前不会生成图片。

首次真实测试建议：

- 优先使用较低延迟模型，例如 `gpt-5.4-mini`。
- 确认链路成功后，再切回 `gpt-5.5` 或更高能力模型。
- 如果出现 timeout：
  - 检查代理。
  - 确认 `OPENAI_PROXY_URL` 协议和端口正确，SOCKS 端口应使用 `socks5h://` 或 `socks5://`。
  - 检查网络。
  - 增大 `OPENAI_TIMEOUT_MS`。
  - 换用更快模型。
  - 查看 OpenAI Dashboard 请求日志。

## 手动测试流程

1. 配置 `.env.local`，写入 `OPENAI_API_KEY` 和 `OPENAI_TEXT_MODEL`。
2. 重启 `npm run dev`。
3. 进入任意作品详情页。
4. 在“书名和简介优化 Mock”区域选择“OpenAI 文本生成”。
5. 点击“生成书名/简介建议”。
6. 如果成功，确认：
   - 新书名方案正常显示。
   - 新简介正常显示。
   - 封面 prompt 正常显示。
   - evidence 中能看到 OpenAI 来源。
   - 刷新页面后结果仍能读取。
7. 如果失败，确认页面能显示明确错误。

## 轻量连通性测试

项目提供 `npm run test:openai-text`，用于手动测试 OpenAI Responses API 文本链路。

该脚本会：

- 从 `.env.local` / 环境变量读取 `OPENAI_API_KEY`、`OPENAI_TEXT_MODEL`、`OPENAI_TIMEOUT_MS`。
- 不打印 API key。
- 发送一个极短的 JSON ping 请求。
- 输出模型、耗时和是否成功。
- 输出 `usingProxy` 和 `proxyProtocol`，用于确认是否走了代理。

Codex 不会主动运行该脚本；真实调用由开发者手动执行。
## 脚本成功但页面失败

`npm run test:openai-text` 成功只能证明脚本链路可用。若页面选择 OpenAI 后仍返回 `Connection error.`，需要确认服务端 `openai-title-intro-adapter.ts` 与测试脚本使用一致的 `OPENAI_PROXY_URL` 处理逻辑。

当前本地 v2rayN SOCKS 代理可用示例：

```env
OPENAI_PROXY_URL=socks5h://127.0.0.1:10808
```

页面调用走 Next.js API route。修改 `.env.local` 或代理配置后，必须重启 `npm run dev`，否则服务端进程可能仍使用旧环境变量。
## 共享 OpenAI client

`scripts/test-openai-text.cjs` 和业务侧 `openai-title-intro-adapter.ts` 必须使用同一个 OpenAI client / proxy 创建逻辑，避免测试脚本成功但页面请求失败。

- `npm run test:openai-text`：只测试最小 OpenAI Responses API ping 链路。
- `npm run test:openai-title-intro`：测试与页面书名/简介 OpenAI 生成相同的 client / proxy 链路和结构化输出路径。
- 如果 `test:openai-text` 成功但页面仍失败，应先运行 `npm run test:openai-title-intro` 定位是基础网络问题还是 title-intro 结构化生成链路问题。
- 当前本地 SOCKS 代理示例：`OPENAI_PROXY_URL=socks5h://127.0.0.1:10808`。
