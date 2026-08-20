/**
 * Standalone test for the dsh-balance-widget host half — no dsh process
 * needed. Mounts the plugin's route handler on a bare node:http server with a
 * minimal fake ctx, then exercises it:
 *
 *   1. no key configured        -> 200 { ok:false, error:'DEEPSEEK_API_KEY 未配置' }
 *   2. explicit config.apiKey   -> 502 upstream error (deliberately bogus key)
 *   3. real key from the seam   -> 200 { ok:true, balance } (live DeepSeek API)
 *      (reads $DSH_HOME/.credentials.yaml directly; the key never prints)
 *
 * Usage: node test/standalone.mjs [--live]
 *   --live also runs case 3 against the real balance endpoint.
 */
import { createServer, request as httpRequest } from 'node:http'
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { apply, fetchBalance, resolveApiKey, ROUTE_PATH } from '../index.js'

function parseYamlCredentials(text) {
  const out = {}
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*?)\s*$/)
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return out
}

function readSeamKey() {
  try {
    const path = join(process.env.DSH_HOME || join(homedir(), '.dsh'), '.credentials.yaml')
    const doc = parseYamlCredentials(readFileSync(path, 'utf8'))
    return doc.DEEPSEEK_API_KEY || undefined
  } catch {
    return undefined
  }
}

/** Build a fake ctx sufficient for apply(). */
function fakeCtx(config) {
  let route = null
  const ctx = {
    webServer: {
      register(r) {
        route = r
        return () => { route = null }
      },
    },
    credentials: {
      async resolve(ref) {
        return ref === 'DEEPSEEK_API_KEY' && config.useSeamKey ? { value: readSeamKey(), source: 'file' } : undefined
      },
    },
    effect(fn) {
      const dispose = fn()
      return () => typeof dispose === 'function' && dispose()
    },
  }
  return { ctx, getRoute: () => route }
}

function request(server, path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const addr = server.address()
    const req = httpRequest({ host: '127.0.0.1', port: addr.port, path, method }, (res) => {
      let body = ''
      res.on('data', (c) => { body += c })
      res.on('end', () => resolve({ status: res.statusCode, body }))
    })
    req.on('error', reject)
    req.end()
  })
}

const live = process.argv.includes('--live')
let failures = 0

async function main() {
  // --- pure function checks ------------------------------------------------
  const pure = fakeCtx({}).ctx
  const noKey = await resolveApiKey(pure, {})
  console.log('resolveApiKey(no config, no seam):', noKey === undefined ? 'undefined (pass)' : 'UNEXPECTED')

  const fakeBalance = await fetchBalance('https://api.deepseek.com', 'sk-invalid-key')
    .then(() => 'UNEXPECTED success')
    .catch((e) => e.message)
  console.log('fetchBalance(bogus key):', fakeBalance.includes('responded') ? `rejects (pass): ${fakeBalance.slice(0, 60)}` : 'UNEXPECTED')

  // --- route behavior ------------------------------------------------------
  const { ctx, getRoute } = fakeCtx({})
  apply(ctx, { intervalSeconds: 60 })
  const route = getRoute()
  if (!route) throw new Error('route not registered')
  if (route.path !== ROUTE_PATH || route.kind !== 'exact') throw new Error('route registration shape wrong')

  // One server; the handler dispatches through this holder so re-applying the
  // plugin with a different config swaps the live handler.
  let currentRoute = route
  const server = createServer((req, res) => currentRoute.handler(req, res))
  await new Promise((r) => server.listen(0, '127.0.0.1', r))

  // 1. no key
  let r = await request(server, ROUTE_PATH)
  let j = JSON.parse(r.body)
  console.log('case1 no-key:', r.status === 200 && j.ok === false ? `200 ok:false (pass)` : `FAIL ${r.status} ${r.body}`)
  if (!(r.status === 200 && j.ok === false)) failures++

  // 2. bogus explicit key -> upstream 502
  apply(ctx, { intervalSeconds: 60, apiKey: 'sk-invalid-key' })
  currentRoute = getRoute()
  r = await request(server, ROUTE_PATH)
  j = JSON.parse(r.body)
  console.log('case2 bogus key:', r.status === 502 && j.ok === false ? '502 upstream error (pass)' : `FAIL ${r.status} ${r.body}`)
  if (!(r.status === 502 && j.ok === false)) failures++

  // 3. live key from the credentials seam (only with --live)
  if (live) {
    const seamKey = readSeamKey()
    if (!seamKey) {
      console.log('case3 live: skipped — no DEEPSEEK_API_KEY in $DSH_HOME/.credentials.yaml')
    } else {
      const { ctx: ctx2, getRoute: getRoute2 } = fakeCtx({ useSeamKey: true })
      apply(ctx2, { intervalSeconds: 60 })
      currentRoute = getRoute2()
      r = await request(server, ROUTE_PATH)
      j = JSON.parse(r.body)
      if (r.status === 200 && j.ok === true) {
        const infos = (j.balance?.balanceInfos || []).map((b) => `${b.currency} ${b.totalBalance}`).join(', ')
        console.log(`case3 live: 200 ok (pass) — ${infos} · interval=${j.meta?.intervalSeconds}s`)
      } else {
        console.log(`case3 live: FAIL ${r.status} ${r.body.slice(0, 200)}`)
        failures++
      }
    }
  }

  server.close()
  process.exit(failures ? 1 : 0)
}

main().catch((e) => { console.error('test crashed:', e); process.exit(1) })
