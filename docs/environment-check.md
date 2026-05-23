# 本地开发环境体检

检查时间：2026-05-23  
项目目录：`D:\porject\tomato title test`

## 结论

当前环境可以进行本地代码编辑和基础 Node.js/npm 开发，但不建议直接进入依赖安装、GitHub 协作或 OpenAI API 调用相关开发，直到网络和代理配置确认完成。

主要风险：

- OpenAI API 域名 `api.openai.com` 当前不可达，且 DNS 解析结果异常。
- GitHub 443 端口可连通，但 `git ls-remote` 访问 GitHub 仓库时连接被重置。
- 本机 `10808` 端口有代理服务监听，但 npm、Git 和当前环境变量都没有配置代理。
- 当前目录不是 Git 仓库。

## 检查明细

| 项目 | 目的 | 命令 | 结果 |
| --- | --- | --- | --- |
| 操作系统 | 确认本机系统和架构 | `$PSVersionTable.PSVersion; Get-CimInstance Win32_OperatingSystem` | Windows 11 专业版，10.0.26200，64-bit；PowerShell 5.1.26100.8457 |
| Node.js/npm/Git | 确认基础开发工具可用 | `node -v; npm -v; git --version` | Node.js `v24.16.0`；npm `11.13.0`；Git `2.54.0.windows.1` |
| npm registry | 确认当前 npm 源 | `npm config get registry` | `https://registry.npmjs.org/` |
| npm 官方 registry | 验证 npm 官方源访问 | `npm ping --registry=https://registry.npmjs.org/` | 成功，`PONG 910ms` |
| npmmirror | 验证国内镜像源访问 | `npm ping --registry=https://registry.npmmirror.com/` | 成功，`PONG 229ms` |
| GitHub TCP | 验证 GitHub 443 端口连通 | `Test-NetConnection github.com -Port 443 -InformationLevel Detailed` | 成功，`TcpTestSucceeded: True` |
| GitHub Git 访问 | 验证 Git 能否实际访问 GitHub 仓库 | `git ls-remote https://github.com/git/git.git HEAD` | 失败：`Recv failure: Connection was reset` |
| OpenAI API 域名 | 验证 OpenAI API 域名 443 端口连通 | `Test-NetConnection api.openai.com -Port 443 -InformationLevel Detailed` | 失败，`TcpTestSucceeded: False` |
| OpenAI API DNS | 检查 API 域名解析是否正常 | `Resolve-DnsName api.openai.com` | 解析到 `199.59.149.232` 和 `2a03:2880:f107:83:face:b00c:0:25de`，结果异常 |
| 代理端口 | 检查常见本地代理端口是否监听 | `Test-NetConnection 127.0.0.1 -Port <port>` | `7890: False`；`7897: False`；`10808: True`；`10809: False` |
| 代理配置 | 确认 npm/Git/环境变量是否使用代理 | `npm config get proxy`; `npm config get https-proxy`; `git config --global --get http.proxy`; 环境变量检查 | npm proxy 为 `null`；未发现 Git 全局代理；未发现 `HTTP_PROXY`、`HTTPS_PROXY`、`ALL_PROXY` |
| Git 仓库状态 | 确认当前目录是否为 Git 仓库 | `git rev-parse --is-inside-work-tree; git status --short` | 失败：当前目录不是 Git 仓库 |
| 文件权限 | 验证 Codex 是否能创建、修改、删除测试文件 | 创建 `.codex-permission-test.tmp`，写入、追加、删除后检查 | 成功：`Created: true`；`Modified: true`；`Deleted: true` |

## 风险判断

### 网络风险

存在。npm 官方源和 npmmirror 可用，但 GitHub 的 Git HTTPS 访问被重置，OpenAI API 域名不可达。后续如果需要安装依赖、拉取远程仓库、调用 OpenAI API，可能出现失败或不稳定。

### 沙箱风险

未发现。当前 Codex 可以在项目目录内创建、修改、删除测试文件。

### 权限风险

未发现明显本地文件权限问题。当前目录写入权限正常。

### 代理风险

存在。`127.0.0.1:10808` 有服务监听，像是本地代理端口，但 npm、Git 和环境变量都未配置代理。当前 GitHub Git 访问和 OpenAI API 访问失败，可能需要让命令行工具显式使用代理。

### registry 风险

较低。当前 npm registry 是官方源，且官方源与 npmmirror 都能访问。npm 官方源当前可用，不需要立即切换 registry。

## 是否适合继续开发

适合继续进行本地代码编辑、项目初始化检查、轻量脚本开发和不依赖外网 API 的工作。

暂不适合直接开展以下工作：

- 依赖大量 npm 安装的功能开发。
- 需要 GitHub clone/fetch/push 的协作流程。
- 需要访问 OpenAI API 的功能联调。

## 是否需要配置代理

建议配置。当前 `10808` 端口正在监听，但命令行没有使用代理。建议先确认该端口对应的代理协议：

- 如果 `10808` 是 HTTP 代理，可配置 `HTTP_PROXY` / `HTTPS_PROXY` 为 `http://127.0.0.1:10808`。
- 如果 `10808` 是 SOCKS 代理，需要使用支持 SOCKS 的工具配置方式，或改用代理客户端提供的 HTTP mixed port。

配置前应先确认代理客户端的端口类型，避免把 SOCKS 端口当 HTTP 代理使用。

## 是否需要切换 npm registry

暂不需要。当前官方 registry `https://registry.npmjs.org/` 可访问，npmmirror 也可访问。除非后续安装依赖明显变慢或失败，否则可以保持官方源。

## 下一步建议

1. 确认本地代理客户端中 `10808` 的协议类型，以及是否有 HTTP mixed port。
2. 为 Git、npm、PowerShell 环境变量配置正确代理后，重新测试：
   - `git ls-remote https://github.com/git/git.git HEAD`
   - `Test-NetConnection api.openai.com -Port 443`
   - 必要时用实际 OpenAI API 请求做鉴权前的连通性验证。
3. 如果该目录后续要作为正式项目目录，初始化 Git 仓库或切换到已有仓库目录。
4. 在网络修复前，避免安装大型依赖或开展依赖远程 API 的业务功能开发。

## 代理修复记录

修复时间：2026-05-23

### 处理动作

确认 `127.0.0.1:10808` 可作为 HTTP 代理使用，并将 npm、Git 和用户级环境变量统一配置为：

```text
http://127.0.0.1:10808
```

执行的配置项：

- `npm config set proxy http://127.0.0.1:10808`
- `npm config set https-proxy http://127.0.0.1:10808`
- `git config --global http.proxy http://127.0.0.1:10808`
- `git config --global https.proxy http://127.0.0.1:10808`
- 用户级环境变量 `HTTP_PROXY=http://127.0.0.1:10808`
- 用户级环境变量 `HTTPS_PROXY=http://127.0.0.1:10808`
- 用户级环境变量 `ALL_PROXY=http://127.0.0.1:10808`

说明：用户级环境变量对新启动的终端和应用生效；当前已通过 npm/Git 持久配置完成命令行工具代理。

### 修复后复测

| 项目 | 命令 | 结果 |
| --- | --- | --- |
| GitHub Git 访问 | `git ls-remote https://github.com/git/git.git HEAD` | 成功，返回 `6a4418c36d6bad69a599044b3cf49dcbd049cb45 HEAD` |
| npm 官方 registry | `npm ping --registry=https://registry.npmjs.org/` | 成功，`PONG 674ms` |
| npmmirror | `npm ping --registry=https://registry.npmmirror.com/` | 成功，`PONG 772ms` |
| OpenAI API | `curl https://api.openai.com/v1/models`，通过 `HTTP_PROXY` / `HTTPS_PROXY` | 成功到达 API，返回预期的 `401 Unauthorized`，原因是未提供 Bearer API Key |
| 代理端口 | `Test-NetConnection 127.0.0.1 -Port <port>` | `7890: False`；`7897: False`；`10808: True`；`10809: False` |

### 当前状态

- GitHub：可达。
- OpenAI API：可达，后续需要配置有效 API Key 才能完成鉴权请求。
- npm 官方 registry：可达。
- npmmirror：可达。
- 代理配置：npm、Git、用户级环境变量均已配置到 `http://127.0.0.1:10808`。

### 剩余注意事项

- 如果代理客户端关闭，GitHub/OpenAI 访问会再次失败；需要保持监听 `127.0.0.1:10808` 的代理服务运行。
- 当前 Codex/终端进程如果是在配置前启动的，可能不会自动继承新写入的用户级环境变量；新开的终端会继承。npm 和 Git 因为使用了工具自身配置，不受此限制。
- 当前目录仍不是 Git 仓库；这不是网络问题，但后续正式开发前需要初始化 Git 仓库或切换到已有仓库。
