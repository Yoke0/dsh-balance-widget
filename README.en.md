# dsh-balance-widget

> A floating balance widget for the DeepSeek Harness Web GUI — see your DeepSeek account balance in real time, right on the page.

[中文](README.md) · A tiny, zero-dependency plugin that pins a floating card to the bottom-right corner of the DeepSeek Harness web UI and periodically queries your DeepSeek account balance — no more opening the console to check how much credit you have left.

## Features

- **Live balance**: auto-refreshes every 60 seconds (configurable) with a live countdown; a manual refresh button is one click away
- **Spend since open**: an estimate of how much was spent since this tab was opened (balance-delta), shown compactly in the footer line; resets when the tab closes, survives page refreshes
- **Polls only while the page is open**: the `dsh web` process itself never makes a request unless a browser tab is actually polling
- **Fully draggable**: the card, the collapsed pill, and the hidden-state pill all drag freely; they share one remembered position (localStorage)
- **Out of the way**: collapse to a small pill, or hide it entirely (a "💰 余额" restore button stays behind)
- **Secure by design**: the API key lives only inside the server-side process — the browser receives balance data only; the key never crosses the wire and never appears in the repo
- **Zero configuration needed**: the key is read automatically from `$DSH_HOME/.credentials.yaml` (where the Models page writes it) or from the environment
- **Convenient shortcuts**: the DeepSeek logo in the title bar opens the official site; a "用量 ↗" link on each balance row jumps to the platform usage page

## Quick Start

### 1. Clone the repository

```sh
git clone https://github.com/Yoke0/dsh-balance-widget.git
```

### 2. Mount it into a dsh profile

Run this from the **parent directory that contains the clone** (replace `--profile web` with your own profile name):

```sh
dsh plugin --profile web add ./dsh-balance-widget
```

This links the repository into `~/.dsh/profiles/web` via pnpm and appends `dsh-balance-widget` to `dsh.profile.bundles`.

> Prefer not to clone? Install straight from the GitHub repo (plain-JS package, no build step needed):
> `dsh plugin --profile web add github:Yoke0/dsh-balance-widget`

### 3. Restart the Web GUI

```sh
dsh web
```

Refresh the browser page and the floating widget appears in the bottom-right corner. If it shows "未配置 API Key" (API key not configured), add the key as described under **Configuration** — **no restart required** afterwards.

### Uninstall

```sh
dsh plugin --profile web remove dsh-balance-widget
```

## Configuration

Override the plugin's `config` in your profile's `cordis.patch.yml`:

```yaml
# ~/.dsh/profiles/web/cordis.patch.yml
- id: balance-widget
  config:
    baseUrl: https://api.deepseek.com   # provider origin
    intervalSeconds: 60                 # polling interval in seconds (min 10)
```

`intervalSeconds` is echoed back to the browser in the route response, and the widget reschedules its timer from it — **a page refresh is enough after changing config**.

### Where the API key comes from

Resolved on every request (changing the key needs no restart), in priority order:

1. `config.apiKey` on the plugin row (not recommended — the config is shared with the browser half)
2. `DEEPSEEK_API_KEY` in `$DSH_HOME/.credentials.yaml` (recommended: the location the GUI Models page writes; hot-reloaded)
3. the `DEEPSEEK_API_KEY` environment variable

## How It Works

```
┌────────────── dsh web process ───────────┐        ┌──────────────────┐
│  index.js (host half)                    │        │  Browser         │
│  ┌─────────────────────────────────────┐ │        │  client.js        │
│  │ ctx.credentials.resolve             │ │  fetch │  floating card     │
│  │   DEEPSEEK_API_KEY  ◄─ .credentials │ │◄───────│  shell.overlay     │
│  │        │                            │ │        │  polls every 60s   │
│  │        ▼                            │ │        └──────────────────┘
│  │ GET /api/balance-widget route       │ │
│  │        │                            │ │
│  │        ▼                            │ │
│  │ GET https://api.deepseek.com/       │ │
│  │     user/balance  (Bearer key)      │ │
│  └─────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

- **Host half**: registers the `GET /api/balance-widget` route and only resolves the key / calls the DeepSeek balance API when a request arrives — fully passive; zero requests while no page is open.
- **Browser half**: registers into the `shell.overlay` slot and starts polling when the page loads; polling stops when the page closes; every tab has its own timer.

## Development & Testing

```sh
node test/standalone.mjs          # offline route behavior (no key / bogus key)
node test/standalone.mjs --live   # live test against the real DeepSeek API with the local key
```

The plugin is a single package with two halves: `index.js` (Node server side) + `client.js` (browser bundle in hand-written lazy-CJS factory format). The browser half is picked up automatically by the `dsh.client` scan into the `window.__DSH_BOOT__` graph; after editing `client.js`, a page refresh is enough (the server reads the bundle from disk on every request).

## Security Notes

- The API key is used only inside the host process — it never appears in the browser, in network responses, or in any Git commit (the repository contains logic and copy only).
- The balance route has no auth, but the web server binds `127.0.0.1` by default.

## Known Limitations

- "Spend since open" is a **balance-delta estimate** (baseline total at page open − current total), not an official bill: mid-session top-ups, refunds, and pending charges distort it. It is tracked per browser tab (page refresh keeps it; closing the tab resets it). For exact usage, use the "用量 ↗" link on each balance row.

## License

MIT
