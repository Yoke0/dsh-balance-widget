/**
 * dsh-balance-widget — host half.
 *
 * Runs in Node inside the dsh web composition. Resolves the DeepSeek API key
 * (per request, never cached) and serves it to the browser half through a
 * single named web route, so the secret never crosses the wire.
 *
 * Route: GET /api/balance-widget
 *   -> 200 { ok: true, balance: { isAvailable, balanceInfos[] }, meta: { intervalSeconds } }
 *   -> 200 { ok: false, error, hint, meta }   (key not configured)
 *   -> 502 { ok: false, error }               (upstream failure)
 *
 * @module dsh-balance-widget
 */

export const name = 'dsh-balance-widget'

/** Required services: the web route registry and the credential seam. */
export const inject = ['webServer', 'credentials']

export const DEFAULT_BASE_URL = 'https://api.deepseek.com'
export const DEFAULT_INTERVAL_SECONDS = 60
/** Credential reference (and env var name) holding the DeepSeek API key. */
export const API_KEY_REF = 'DEEPSEEK_API_KEY'
/** Route the browser half polls. */
export const ROUTE_PATH = '/api/balance-widget'

/**
 * Resolve the API key for one request. Order: explicit config -> credential
 * seam ($DSH_HOME/.credentials.yaml, itself layered over the environment) ->
 * process environment. Per-operation read, never cached, so a changed
 * credential reaches the next request without a restart.
 * @param ctx - plugin context carrying the credentials service.
 * @param config - plugin config (may carry an explicit apiKey).
 * @returns the key, or undefined when unconfigured.
 */
export async function resolveApiKey(ctx, config = {}) {
  if (config.apiKey) return config.apiKey
  const resolved = await ctx.credentials?.resolve(API_KEY_REF)
  if (resolved) return resolved.value
  return process.env[API_KEY_REF]
}

/**
 * Query the DeepSeek balance endpoint for one key.
 * @param baseUrl - provider origin, e.g. https://api.deepseek.com.
 * @param apiKey - bearer token.
 * @param signal - optional AbortSignal.
 * @returns a normalized balance snapshot.
 */
export async function fetchBalance(baseUrl, apiKey, signal) {
  const endpoint = `${baseUrl.replace(/\/+$/, '')}/user/balance`
  const res = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
    signal,
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`balance endpoint responded ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`)
  }
  const body = await res.json()
  return {
    isAvailable: body.is_available === true,
    balanceInfos: Array.isArray(body.balance_infos)
      ? body.balance_infos.map((info) => ({
          currency: info.currency,
          totalBalance: info.total_balance,
          grantedBalance: info.granted_balance,
          toppedUpBalance: info.topped_up_balance,
        }))
      : [],
  }
}

/**
 * Plugin body. Registers the balance route on the web server; the returned
 * effect disposer removes it on unload.
 * @param ctx - cordis context with webServer and credentials injected.
 * @param config - plugin row config ({ baseUrl, intervalSeconds, apiKey? }).
 */
export function apply(ctx, config = {}) {
  const baseUrl = config.baseUrl || DEFAULT_BASE_URL
  const intervalSeconds = Math.max(
    10,
    Number.isFinite(Number(config.intervalSeconds)) ? Number(config.intervalSeconds) : DEFAULT_INTERVAL_SECONDS,
  )

  ctx.effect(() => {
    const disposeRoute = ctx.webServer.register({
      kind: 'exact',
      path: ROUTE_PATH,
      handler: async (req, res) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          res.writeHead(405, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: false, error: 'method not allowed' }))
          return
        }

        const send = (status, payload) => {
          const body = JSON.stringify(payload)
          res.writeHead(status, {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
          })
          res.end(req.method === 'HEAD' ? undefined : body)
        }

        try {
          const apiKey = await resolveApiKey(ctx, config)
          if (!apiKey) {
            send(200, {
              ok: false,
              error: 'DEEPSEEK_API_KEY 未配置',
              hint: 'Set apiKey in the plugin config, add DEEPSEEK_API_KEY to $DSH_HOME/.credentials.yaml, or export the environment variable.',
              meta: { intervalSeconds },
            })
            return
          }

          const balance = await fetchBalance(baseUrl, apiKey, AbortSignal.timeout(10_000))
          send(200, { ok: true, balance, meta: { intervalSeconds } })
        } catch (err) {
          send(502, { ok: false, error: err instanceof Error ? err.message : String(err) })
        }
      },
    })
    return disposeRoute
  })
}
