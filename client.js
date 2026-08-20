/**
 * dsh-balance-widget — browser half.
 *
 * Hand-written lazy-CJS factory bundle for the client-modules loader:
 * executing this script only REGISTERS the factory
 * (`window.__ModuleLoader__.load({ id, factory })`); every side effect —
 * CSS injection, the React component, the plugin object — runs at
 * materialization, when the client cordis imports the package.
 *
 * The plugin registers a floating balance card into the `shell.overlay`
 * slot (declared by dsh-client-ui-layout) and polls the host route
 * GET /api/balance-widget (registered by the host half, index.js).
 *
 * Only `react` is required (a platform seed word) — no cross-plugin value
 * imports, per the bundle-purity gate.
 */
window.__ModuleLoader__.load({
  id: "dsh-balance-widget",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    var React = require("react");
    var useState = React.useState;
    var useEffect = React.useEffect;
    var useLayoutEffect = React.useLayoutEffect;
    var useRef = React.useRef;
    var useCallback = React.useCallback;
    var el = React.createElement;

    // ── injected styles (run once at materialization) ────────────────────────
    var CSS_ID = "dsh-balance-widget/styles";
    if (
      typeof document !== "undefined" &&
      document.querySelector('style[data-plugin-css="' + CSS_ID + '"]') === null
    ) {
      var tag = document.createElement("style");
      tag.dataset.plugin = "dsh-balance-widget";
      tag.dataset.pluginCss = CSS_ID;
      tag.textContent = [
        '[data-dsh-balance-widget-root] { position: fixed; right: 20px; bottom: 20px; z-index: 9999; }',
        '[data-dsh-balance-widget-root][data-pos] { right: auto; bottom: auto; }',
        '[data-dsh-balance-widget-pill][data-pos] { right: auto; bottom: auto; }',
        '[data-dsh-balance-widget] { box-sizing: border-box; width: 264px; background: var(--dsw-alias-bg-layer-3, #ffffff); border: 1px solid var(--dsw-alias-border-l2, #e5e7eb); border-radius: 12px; box-shadow: 0 8px 28px rgba(0, 0, 0, 0.16); color: var(--dsw-alias-label-primary, #111827); font-family: var(--dsw-font-family, system-ui, sans-serif); font-size: 13px; line-height: 1.45; user-select: none; overflow: hidden; }',
        '[data-dsh-balance-widget] * { box-sizing: border-box; }',
        '[data-dsh-balance-widget-header] { display: flex; align-items: center; gap: 6px; padding: 10px 12px; border-bottom: 1px solid var(--dsw-alias-border-l2, #e5e7eb); cursor: grab; background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, 0.03)); touch-action: none; }',
        '[data-dsh-balance-widget-header]:active { cursor: grabbing; }',
        '[data-dsh-balance-widget-title] { flex: 1; font-weight: 600; font-size: 13px; display: flex; align-items: center; gap: 6px; min-width: 0; }',
        '[data-dsh-balance-widget-dot] { width: 8px; height: 8px; border-radius: 50%; flex: none; }',
        '[data-dsh-balance-widget-dot][data-status="ok"] { background: #22c55e; }',
        '[data-dsh-balance-widget-dot][data-status="loading"] { background: #f59e0b; }',
        '[data-dsh-balance-widget-dot][data-status="error"] { background: var(--dsw-alias-state-error-primary, #ef4444); }',
        '[data-dsh-balance-widget-dot][data-status="no-key"] { background: #9ca3af; }',
        '[data-dsh-balance-widget-btn] { border: none; background: transparent; color: var(--dsw-alias-label-secondary, #6b7280); width: 24px; height: 24px; border-radius: 6px; cursor: pointer; font-size: 13px; line-height: 1; padding: 0; flex: none; }',
        '[data-dsh-balance-widget-btn]:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, 0.08)); color: var(--dsw-alias-label-primary, #111827); }',
        '[data-dsh-balance-widget-btn][data-spin] { animation: dshBalanceWidgetSpin 0.8s linear infinite; }',
        '@keyframes dshBalanceWidgetSpin { to { transform: rotate(360deg); } }',
        '[data-dsh-balance-widget-body] { padding: 10px 12px; }',
        '[data-dsh-balance-widget-row] { display: flex; justify-content: space-between; align-items: baseline; padding: 2px 0; }',
        '[data-dsh-balance-widget-amount] { font-size: 16px; font-weight: 700; font-variant-numeric: tabular-nums; }',
        '[data-dsh-balance-widget-sub] { color: var(--dsw-alias-label-secondary, #6b7280); font-size: 12px; }',
        '[data-dsh-balance-widget-link] { color: var(--dsw-alias-state-business-primary, #3964fe); font-size: 12px; text-decoration: none; cursor: pointer; white-space: nowrap; }',
        '[data-dsh-balance-widget-link]:hover { text-decoration: underline; }',
        '[data-dsh-balance-widget-meta] { margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--dsw-alias-border-l2, #e5e7eb); color: var(--dsw-alias-label-secondary, #6b7280); font-size: 11px; display: flex; justify-content: space-between; gap: 8px; }',
        '[data-dsh-balance-widget-error] { color: var(--dsw-alias-state-error-primary, #ef4444); font-size: 12px; white-space: pre-wrap; word-break: break-all; }',
        '[data-dsh-balance-widget-status] { display: flex; align-items: center; gap: 6px; padding: 2px 0; }',
        '[data-dsh-balance-widget-pill] { position: fixed; right: 20px; bottom: 20px; z-index: 9999; border: 1px solid var(--dsw-alias-border-l2, #e5e7eb); background: var(--dsw-alias-bg-layer-3, #ffffff); color: var(--dsw-alias-label-primary, #111827); border-radius: 18px; padding: 6px 12px; font-size: 12px; cursor: grab; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.14); font-family: var(--dsw-font-family, system-ui, sans-serif); touch-action: none; }',
        '[data-dsh-balance-widget-pill]:hover { background: var(--dsw-alias-brand-primary, #3964fe); color: var(--dsw-alias-label-primary-foreground, #fff); }',
        '[data-dsh-balance-widget][data-dragging] { transition: none; }',
        '@media (prefers-reduced-motion: reduce) { [data-dsh-balance-widget-dot] { animation: none; } }'
      ].join("\n");
      document.head.appendChild(tag);
    }

    // ── widget state helpers ──────────────────────────────────────────────────
    var STORAGE_HIDDEN = "dsh-balance-widget.hidden";
    var STORAGE_POS = "dsh-balance-widget.pos";
    var CURRENCY_SYMBOLS = { CNY: "¥", USD: "$", EUR: "€", JPY: "¥" };

    function readStorage(key, fallback) {
      try {
        var raw = localStorage.getItem(key);
        return raw === null ? fallback : raw;
      } catch (e) {
        return fallback;
      }
    }

    function writeStorage(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        /* private mode etc. — non-fatal */
      }
    }

    function formatAmount(info) {
      var symbol = CURRENCY_SYMBOLS[info.currency] || "";
      return symbol + info.totalBalance + (symbol ? "" : " " + info.currency);
    }

    function timeLabel(ts) {
      if (!ts) return "";
      var d = new Date(ts);
      var hh = String(d.getHours()).padStart(2, "0");
      var mm = String(d.getMinutes()).padStart(2, "0");
      var ss = String(d.getSeconds()).padStart(2, "0");
      return hh + ":" + mm + ":" + ss;
    }

    // ── the floating balance card ─────────────────────────────────────────────
    function BalanceWidget() {
      var [data, setData] = useState(null);
      var [status, setStatus] = useState("loading"); // loading | ok | no-key | error
      var [error, setError] = useState(null);
      var [intervalSec, setIntervalSec] = useState(60);
      var [remaining, setRemaining] = useState(60);
      var [lastUpdate, setLastUpdate] = useState(null);
      var [collapsed, setCollapsed] = useState(false);
      var [hidden, setHidden] = useState(() => readStorage(STORAGE_HIDDEN, "0") === "1");
      var [pos, setPos] = useState(function () {
        try {
          var raw = readStorage(STORAGE_POS, null);
          if (!raw) return null;
          var parsed = JSON.parse(raw);
          return typeof parsed.x === "number" && typeof parsed.y === "number" ? parsed : null;
        } catch (e) {
          return null;
        }
      });
      var [dragging, setDragging] = useState(false);
      var [refreshing, setRefreshing] = useState(false);
      var [cardSize, setCardSize] = useState(null);
      var dragRef = useRef(null);
      var wasDraggedRef = useRef(false);
      var cardRef = useRef(null);

      // Re-measure the card whenever its content changes, so the expanded
      // position clamp always uses the real size.
      useLayoutEffect(function () {
        var node = cardRef.current;
        if (!node) return;
        var rect = node.getBoundingClientRect();
        var next = { width: rect.width, height: rect.height };
        setCardSize(function (prev) {
          return prev && prev.width === next.width && prev.height === next.height ? prev : next;
        });
      }, [status, data, error]);

      var refresh = useCallback(async function () {
        setRefreshing(true);
        try {
          var res = await fetch("/api/balance-widget", { cache: "no-store" });
          var json = await res.json();
          if (json && json.ok === true) {
            setData(json.balance);
            setError(null);
            setStatus("ok");
            if (json.meta && Number.isFinite(Number(json.meta.intervalSeconds))) {
              setIntervalSec(Number(json.meta.intervalSeconds));
            }
          } else {
            setData(null);
            var msg = (json && json.error) || "unknown error";
            setError(msg);
            setStatus(/未配置|DEEPSEEK_API_KEY/.test(msg) ? "no-key" : "error");
          }
        } catch (err) {
          setData(null);
          setError(err instanceof Error ? err.message : String(err));
          setStatus("error");
        } finally {
          setLastUpdate(Date.now());
          setRefreshing(false);
        }
      }, []);

      useEffect(function () {
        refresh();
        var timer = setInterval(refresh, intervalSec * 1000);
        return function () {
          clearInterval(timer);
        };
      }, [refresh, intervalSec]);

      // One-second ticker driving the countdown display.
      useEffect(function () {
        var timer = setInterval(function () {
          setRemaining(function (prev) {
            return prev > 0 ? prev - 1 : 0;
          });
        }, 1000);
        return function () {
          clearInterval(timer);
        };
      }, []);

      // Each completed refresh (or an interval change) resets the countdown.
      useEffect(function () {
        setRemaining(intervalSec);
      }, [lastUpdate, intervalSec]);

      useEffect(function () {
        writeStorage(STORAGE_HIDDEN, hidden ? "1" : "0");
      }, [hidden]);

      function toggleHidden() {
        setHidden(function (prev) {
          var next = !prev;
          if (next) setCollapsed(false);
          return next;
        });
      }

      function onPointerDown(e) {
        if (e.button !== 0) return;
        // Icon buttons must keep their click — never start a drag (and never
        // pointer-capture, which would retarget the click away from the button).
        if (e.target && e.target.closest && e.target.closest("[data-dsh-balance-widget-btn]")) return;
        var rect = e.currentTarget.getBoundingClientRect();
        dragRef.current = {
          dx: e.clientX - rect.left,
          dy: e.clientY - rect.top,
          w: rect.width,
          h: rect.height,
          moved: false,
        };
        setDragging(true);
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch (err) {
          /* pointer capture unsupported — drag still works while pressed */
        }
      }

      function onPointerMove(e) {
        var d = dragRef.current;
        if (!d) return;
        d.moved = true;
        // Clamp by the dragged element's own size so it never leaves the viewport.
        var x = Math.min(Math.max(e.clientX - d.dx, 8), Math.max(8, window.innerWidth - d.w - 8));
        var y = Math.min(Math.max(e.clientY - d.dy, 8), Math.max(8, window.innerHeight - d.h - 8));
        var next = { x: x, y: y };
        setPos(next);
        writeStorage(STORAGE_POS, JSON.stringify(next));
      }

      function onPointerUp() {
        var d = dragRef.current;
        if (d && d.moved) wasDraggedRef.current = true;
        dragRef.current = null;
        setDragging(false);
      }

      /**
       * Wrap a pill's click action so a completed drag (moved) does not fire it:
       * pointerup -> click always follows a drag, and we must not collapse/
       * restore when the user only moved the pill.
       */
      function consumeDragAction(fn) {
        return function () {
          if (wasDraggedRef.current) {
            wasDraggedRef.current = false;
            return;
          }
          fn();
        };
      }

      var rootStyle = pos ? { left: pos.x, top: pos.y } : undefined;

      // Expanded card position, clamped so the WHOLE card stays visible even
      // when it was opened from a pill parked at the viewport edge. Estimate
      // the size on first render, then use the measured value.
      var CARD_EST_WIDTH = 266;
      var CARD_EST_HEIGHT = 150;
      var cardStyle = pos
        ? {
            left: Math.max(8, Math.min(pos.x, window.innerWidth - (cardSize ? cardSize.width : CARD_EST_WIDTH) - 8)),
            top: Math.max(8, Math.min(pos.y, window.innerHeight - (cardSize ? cardSize.height : CARD_EST_HEIGHT) - 8)),
          }
        : undefined;

      if (hidden) {
        return el(
          "button",
          {
            "data-dsh-balance-widget-pill": "",
            "data-pos": pos ? "" : undefined,
            style: rootStyle,
            onPointerDown: onPointerDown,
            onPointerMove: onPointerMove,
            onPointerUp: onPointerUp,
            onClick: consumeDragAction(toggleHidden),
            title: "显示余额悬浮窗",
          },
          "💰 余额"
        );
      }

      if (collapsed) {
        return el(
          "div",
          { "data-dsh-balance-widget-root": "", "data-pos": pos ? "" : undefined, style: rootStyle },
          el(
            "button",
            {
              "data-dsh-balance-widget-pill": "",
              style: { position: "static" },
              onPointerDown: onPointerDown,
              onPointerMove: onPointerMove,
              onPointerUp: onPointerUp,
              onClick: consumeDragAction(function () {
                setCollapsed(false);
              }),
              title: "展开余额悬浮窗",
            },
            "💰 " + (data && data.balanceInfos && data.balanceInfos.length
              ? formatAmount(data.balanceInfos[0])
              : "余额")
          )
        );
      }

      var dotStatus = status === "no-key" ? "error" : status;
      var title = status === "ok"
        ? (data && data.isAvailable === false ? "余额不可用" : "账户余额")
        : status === "no-key"
          ? "未配置 API Key"
          : status === "error"
            ? "查询失败"
            : "查询中…";

      var body = null;
      if (status === "ok" && data) {
        body = el(
          "div",
          null,
          data.balanceInfos.map(function (info) {
            return el(
              "div",
              { "data-dsh-balance-widget-row": "", key: info.currency || "?" },
              el("span", { "data-dsh-balance-widget-amount": "" }, formatAmount(info)),
              el(
                "a",
                {
                  "data-dsh-balance-widget-link": "",
                  href: "https://platform.deepseek.com/usage",
                  target: "_blank",
                  rel: "noreferrer noopener",
                  title: "打开 DeepSeek 平台用量页面",
                },
                "用量 ↗"
              )
            );
          }),
          el(
            "div",
            { "data-dsh-balance-widget-meta": "" },
            el("span", null, "更新于 " + timeLabel(lastUpdate)),
            el("span", { title: "距离下次自动刷新" }, "⏳ " + remaining + "s")
          )
        );
      } else if (status === "no-key" || status === "error") {
        body = el(
          "div",
          { "data-dsh-balance-widget-error": "" },
          status === "no-key"
            ? "未找到 DEEPSEEK_API_KEY\n请在设置中配置密钥后刷新"
            : String(error || "")
        );
      } else {
        body = el("div", { "data-dsh-balance-widget-status": "" }, el("span", { "data-dsh-balance-widget-dot": "", "data-status": "loading" }), el("span", null, "正在查询余额…"));
      }

      return el(
        "div",
        {
          "data-dsh-balance-widget-root": "",
          "data-pos": pos ? "" : undefined,
          style: cardStyle,
        },
        el(
          "div",
          {
            "data-dsh-balance-widget": "",
            "data-dragging": dragging || undefined,
            ref: cardRef,
          },
          el(
            "div",
            {
              "data-dsh-balance-widget-header": "",
              onPointerDown: onPointerDown,
              onPointerMove: onPointerMove,
              onPointerUp: onPointerUp,
            },
            el(
              "div",
              { "data-dsh-balance-widget-title": "" },
              el("span", { "data-dsh-balance-widget-dot": "", "data-status": dotStatus }),
              el("span", null, title)
            ),
            el(
              "button",
              {
                "data-dsh-balance-widget-btn": "",
                "data-spin": refreshing || undefined,
                title: "立即刷新",
                onClick: refresh,
              },
              "⟳"
            ),
            el(
              "button",
              {
                "data-dsh-balance-widget-btn": "",
                title: "收起",
                onClick: function () {
                  setCollapsed(true);
                },
              },
              "—"
            ),
            el(
              "button",
              {
                "data-dsh-balance-widget-btn": "",
                title: "隐藏",
                onClick: toggleHidden,
              },
              "×"
            )
          ),
          el("div", { "data-dsh-balance-widget-body": "" }, body)
        )
      );
    }

    // ── plugin surface ────────────────────────────────────────────────────────
    var name = "dsh-balance-widget";
    var inject = ["slots"];

    function apply(ctx) {
      ctx.inject(["slots"], function (scope) {
        var dispose = scope.slots.inject("shell.overlay", function () {
          return scope.slots.register(
            { name: "shell.overlay", id: "balanceWidget" },
            BalanceWidget
          );
        });
        return function () {
          dispose();
        };
      });
    }

    module.exports = { name: name, inject: inject, apply: apply };
    return module.exports;
  },
});
