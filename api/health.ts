/**
 * GET /api/health — «жив ли кабинет».
 *
 * Проверяет по отдельности всё, без чего кабинет не работает:
 *   auth     — сервис входа Supabase отвечает;
 *   database — сама база выполняет запрос (функция health_check).
 *
 * Ответ 200, если всё в порядке, и 503, если что-то сломано, —
 * мониторинг (UptimeRobot) смотрит именно на код ответа. В теле —
 * подробности по каждой проверке и время ответа: по ним видно, что
 * именно легло, ещё до того, как открывать логи.
 */

import { log } from './_lib/log.js'

const TIMEOUT_MS = 4000

export interface CheckResult {
  ok: boolean
  latencyMs: number
  error?: string
}

async function timed(run: () => Promise<Response>): Promise<CheckResult> {
  const started = Date.now()
  try {
    const response = await run()
    const latencyMs = Date.now() - started
    if (!response.ok) return { ok: false, latencyMs, error: `HTTP ${response.status}` }
    return { ok: true, latencyMs }
  } catch (cause) {
    const latencyMs = Date.now() - started
    const error =
      cause instanceof Error && cause.name === 'TimeoutError'
        ? `нет ответа за ${TIMEOUT_MS} мс`
        : String(cause instanceof Error ? cause.message : cause)
    return { ok: false, latencyMs, error }
  }
}

export async function runChecks(
  url: string,
  key: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Record<string, CheckResult>> {
  const headers = { apikey: key }
  const [auth, database] = await Promise.all([
    timed(() =>
      fetchImpl(`${url}/auth/v1/health`, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) }),
    ),
    timed(() =>
      fetchImpl(`${url}/rest/v1/rpc/health_check`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: '{}',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }),
    ),
  ])
  return { auth, database }
}

export async function GET(): Promise<Response> {
  const url = process.env.VITE_SUPABASE_URL ?? ''
  const key = process.env.VITE_SUPABASE_ANON_KEY ?? ''
  // Версию выставляет пайплайн при выкладке (--env APP_VERSION=…):
  // по ней CI убеждается, что отвечает именно новая сборка, а не старая.
  const version =
    process.env.APP_VERSION ?? process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local'

  const noStore = { 'Cache-Control': 'no-store' }

  if (!url || !key) {
    log('error', 'health', 'нет настроек подключения к базе')
    return Response.json(
      { status: 'down', error: 'не заданы VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY', version },
      { status: 503, headers: noStore },
    )
  }

  const checks = await runChecks(url, key)
  const healthy = Object.values(checks).every((check) => check.ok)

  log(healthy ? 'info' : 'error', 'health', healthy ? 'всё в порядке' : 'есть сбой', { checks })

  return Response.json(
    { status: healthy ? 'ok' : 'down', checks, version, time: new Date().toISOString() },
    { status: healthy ? 200 : 503, headers: noStore },
  )
}
