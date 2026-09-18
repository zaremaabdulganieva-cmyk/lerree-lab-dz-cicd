// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GET, runChecks } from '../health.js'

/**
 * Проверка здоровья сама должна быть надёжной: если она ошибается,
 * мониторинг либо будит зря, либо молчит, когда всё лежит.
 */

const URL = 'https://demo.supabase.co'

function fakeFetch(responses: Record<string, number | 'timeout' | 'network'>) {
  return vi.fn(async (input: string | URL | Request) => {
    const address = String(input)
    const key = Object.keys(responses).find((part) => address.includes(part))
    const outcome = key ? responses[key] : 200
    if (outcome === 'timeout') {
      const error = new Error('timeout')
      error.name = 'TimeoutError'
      throw error
    }
    if (outcome === 'network') throw new TypeError('fetch failed')
    return new Response('{}', { status: outcome })
  }) as unknown as typeof fetch
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('runChecks — отдельные проверки', () => {
  it('всё отвечает — обе проверки зелёные', async () => {
    const checks = await runChecks(URL, 'key', fakeFetch({}))
    expect(checks.auth.ok).toBe(true)
    expect(checks.database.ok).toBe(true)
  })

  it('база ответила ошибкой — видно, что легла именно база', async () => {
    const checks = await runChecks(URL, 'key', fakeFetch({ health_check: 500 }))
    expect(checks.auth.ok).toBe(true)
    expect(checks.database).toMatchObject({ ok: false, error: 'HTTP 500' })
  })

  it('сервис входа не ответил вовремя — понятная причина', async () => {
    const checks = await runChecks(URL, 'key', fakeFetch({ 'auth/v1/health': 'timeout' }))
    expect(checks.auth.ok).toBe(false)
    expect(checks.auth.error).toMatch(/нет ответа/)
  })

  it('сеть недоступна — проверка не падает, а сообщает о сбое', async () => {
    const checks = await runChecks(URL, 'key', fakeFetch({ health_check: 'network' }))
    expect(checks.database).toMatchObject({ ok: false, error: 'fetch failed' })
  })
})

describe('GET /api/health — ответ мониторингу', () => {
  it('без настроек подключения отвечает 503, а не падает', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const response = await GET()

    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ status: 'down' })
  })

  it('при сбое базы отвечает 503 — мониторинг поднимет тревогу', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', URL)
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'key')
    vi.stubGlobal('fetch', fakeFetch({ health_check: 503 }))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const response = await GET()

    expect(response.status).toBe(503)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })

  it('когда всё работает — 200 и статус ok', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', URL)
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'key')
    vi.stubGlobal('fetch', fakeFetch({}))
    vi.spyOn(console, 'log').mockImplementation(() => {})

    const response = await GET()
    const body = (await response.json()) as {
      status: string
      checks: { database: { ok: boolean } }
    }

    expect(response.status).toBe(200)
    expect(body.status).toBe('ok')
    expect(body.checks.database.ok).toBe(true)
  })
})
