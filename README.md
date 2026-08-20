# dsh-balance-widget

DeepSeek Harness Web GUI 插件：右下角悬浮窗，定时查询 DeepSeek 账户余额。

- **Host 半边**（`index.js`）：在 Node 里解析 API Key（每次请求实时解析，绝不缓存），并注册 `GET /api/balance-widget` 路由。Key 只留在 Host 侧，永不过网。
- **Browser 半边**（`client.js`）：悬浮窗注册进 `shell.overlay` 槽位，定时轮询该路由，显示各币种余额、赠送/充值余额、更新时间；可拖动、可收起、可隐藏（位置与隐藏状态持久化在 localStorage）。

## 工作原理

```
┌────────────── dsh web 进程 ──────────────┐        ┌──────────────────┐
│  index.js (host half)                    │        │  浏览器           │
│  ┌─────────────────────────────────────┐ │        │  client.js        │
│  │ ctx.credentials.resolve             │ │  fetch │  悬浮窗 (React)    │
│  │   DEEPSEEK_API_KEY  ◄─ .credentials │ │◄───────│  shell.overlay 槽  │
│  │        │                            │ │        │  每 60s 轮询       │
│  │        ▼                            │ │        └──────────────────┘
│  │ GET /api/balance-widget 路由         │ │
│  │        │                            │ │
│  │        ▼                            │ │
│  │ GET https://api.deepseek.com/       │ │
│  │     user/balance  (Bearer key)      │ │
│  └─────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

API Key 解析顺序（每次请求重新解析，改 Key 无需重启）：

1. 插件行 `config.apiKey`（不推荐，配置会共享给浏览器半边）
2. `$DSH_HOME/.credentials.yaml` 中的 `DEEPSEEK_API_KEY`（推荐 —— Models 页面写入的位置）
3. 环境变量 `DEEPSEEK_API_KEY`

## 安装

```sh
cd /Users/bytedance/DeepSeek
dsh plugin --profile web add ./balance-widget
```

这会初始化/更新 `~/.dsh/profiles/web`：pnpm 链接该目录，并把 `dsh-balance-widget`
追加进 `dsh.profile.bundles`。之后**重启** Web GUI（`dsh web`）使组合生效：

```sh
dsh web
```

刷新页面后右下角出现悬浮窗。

> 若使用 `--patch` overlay 方式快速试验（不改 profile）：
> 创建一个 `overlay.yml`：
> ```yaml
> - insert:
>     - id: balance-widget
>       name: '/Users/bytedance/DeepSeek/balance-widget/index.js'
>       inject: [webServer, credentials]
>       config:
>         baseUrl: https://api.deepseek.com
>         intervalSeconds: 60
> ```
> 然后 `dsh web --patch ./overlay.yml`。注意：此方式只加载 Host 半边，
> 浏览器半边需要按「打包发布」方式安装才会出现悬浮窗。

## 配置

在 profile 的 `cordis.patch.yml` 或组合包层中覆盖 `config`：

```yaml
- id: balance-widget
  config:
    baseUrl: https://api.deepseek.com   # 供应商源站
    intervalSeconds: 60                 # 轮询间隔（秒，最小 10）
```

`intervalSeconds` 会随路由响应回传给浏览器，浏览器据此重新调度定时器，改配置后刷新页面即生效。

## 路由

`GET /api/balance-widget`（`webServer` exact 路由，无鉴权 —— 默认仅绑定 127.0.0.1）：

```jsonc
// 成功
{ "ok": true,
  "balance": { "isAvailable": true,
    "balanceInfos": [{ "currency": "CNY", "totalBalance": "110.00",
      "grantedBalance": "10.00", "toppedUpBalance": "100.00" }] },
  "meta": { "intervalSeconds": 60 } }

// Key 未配置（200，浏览器显示引导文案）
{ "ok": false, "error": "DEEPSEEK_API_KEY 未配置", "hint": "...", "meta": { "intervalSeconds": 60 } }

// 上游失败（502）
{ "ok": false, "error": "balance endpoint responded 401: ..." }
```

## 本地测试（不启动 dsh）

```sh
node test/standalone.mjs          # 离线路由行为（无 Key / 错误 Key）
node test/standalone.mjs --live   # 再用 .credentials.yaml 里的真 Key 打真实接口
```

## 打包发布（可选）

把 `dsh-balance-widget` 发布到 npm 或用 `pnpm pack` 出 tarball 后，
`dsh plugin --profile <name> add <pkg>` 安装，即可在任何机器上使用（浏览器半边
随 `dsh.client` 扫描自动进入 `window.__DSH_BOOT__` 组合图）。
