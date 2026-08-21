# dsh-balance-widget

> DeepSeek Harness Web GUI 余额悬浮窗插件 —— 打开页面即可实时看到 DeepSeek 账户余额。

[English](README.en.md) · 一个零依赖的小插件：在 DeepSeek Harness 的 Web 界面右下角挂一个悬浮卡片，定时查询你的 DeepSeek 账户余额，余额多少、还剩多少一目了然，不用再手动打开控制台去查。

## 特性

- **实时余额**：每 60 秒自动刷新（可配置），带实时倒计时，也可手动点击立即刷新
- **随开随用**：只在你打开 Web 界面时轮询，`dsh web` 进程本身不做任何主动请求
- **拖拽自由**：悬浮卡片、收起胶囊、隐藏胶囊三种形态都能拖动，位置保持一致并记住（localStorage）
- **不挡视线**：可收起为小胶囊，也可完全隐藏（留下一个「💰 余额」恢复按钮）
- **安全**：API Key 只存在于服务端进程内，浏览器只拿到余额数据，密钥永不过网、不进仓库
- **开箱即用**：Key 自动读取 `$DSH_HOME/.credentials.yaml`（Models 页面写入的位置）或环境变量
- **便捷跳转**：标题栏 DeepSeek logo 直达官网，每行金额旁的「用量 ↗」直达平台用量页

## 快速开始

### 1. 克隆仓库

```sh
git clone https://github.com/Yoke0/dsh-balance-widget.git
```

### 2. 挂载到 dsh profile

在**包含克隆目录的父目录**下执行（`--profile web` 换成你自己的 profile 名）：

```sh
dsh plugin --profile web add ./dsh-balance-widget
```

这会用 pnpm 把仓库链接进 `~/.dsh/profiles/web`，并把 `dsh-balance-widget` 追加进 `dsh.profile.bundles`。

> 不克隆也可以直接按 GitHub 仓库安装（纯 JS 包，无需构建脚本）：
> `dsh plugin --profile web add github:Yoke0/dsh-balance-widget`

### 3. 重启 Web GUI

```sh
dsh web
```

重启后刷新浏览器页面，右下角出现悬浮窗。若显示「未配置 API Key」，按下方「配置」补上 Key 即可，**无需再次重启**。

### 卸载

```sh
dsh plugin --profile web remove dsh-balance-widget
```

## 配置

在 profile 的 `cordis.patch.yml` 中覆盖插件的 `config`：

```yaml
# ~/.dsh/profiles/web/cordis.patch.yml
- id: balance-widget
  config:
    baseUrl: https://api.deepseek.com   # 供应商源站
    intervalSeconds: 60                 # 轮询间隔（秒，最小 10）
```

`intervalSeconds` 会随路由响应回传给浏览器，浏览器据此重新调度定时器——**改配置后刷新页面即生效**。

### API Key 从哪来

每次请求实时解析（改 Key 无需重启），优先级：

1. 插件行 `config.apiKey`（不推荐：配置会共享给浏览器半边）
2. `$DSH_HOME/.credentials.yaml` 里的 `DEEPSEEK_API_KEY`（推荐：GUI Models 页面写入的位置，改完热生效）
3. 环境变量 `DEEPSEEK_API_KEY`

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

- **Host 半边**：注册 `GET /api/balance-widget` 路由，收到请求才解析 Key 并调用 DeepSeek 余额接口——**完全被动**，没有浏览器打开时零请求；
- **Browser 半边**：注册进 `shell.overlay` 槽位，页面打开时开始轮询，关页面即停止；每个标签页独立计时。

## 开发与测试

```sh
node test/standalone.mjs          # 离线路由行为（无 Key / 错误 Key）
node test/standalone.mjs --live   # 用本机凭证对真实 DeepSeek API 实测
```

插件是双半边单包结构：`index.js`（Node 服务端）+ `client.js`（浏览器 bundle，手写 lazy-CJS 工厂格式）。浏览器半边由 `dsh.client` 扫描自动编入 `window.__DSH_BOOT__` 组合图，改完 `client.js` 刷新页面即生效（服务端每次从磁盘读 bundle）。

## 安全说明

- API Key 只在 Host 进程内使用，**不会**出现在浏览器、网络响应或任何 Git 提交中（仓库只含逻辑与文案）；
- 余额路由无鉴权，但 Web 服务器默认只绑定 `127.0.0.1`。

## License

MIT
