// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { POST, parseEntry } from '../log.js'

/**
 * Приёмник ошибок открыт всем, поэтому важно не только «принимает
 * правильное», но и «не пускает мусор».
 */

const good = {
  level: 'error',
  scope: 'api.saveSets',
  message: 'server: Сервер не смог обработать запрос',
  details: '500 | internal error',
  version: 'abc1234',
  session: 'k3j2h1',
  path: '/workouts/1',
  time: '2026-09-30T10:00:00.000Z',
}

afterEach(() => vi.restoreAllMocks())

describe('parseEntry — что принимаем', () => {
  it('запись журнала кабинета проходит целиком', () => {
    expect(parseEntry(JSON.stringify(good))).toMatchObject({
      level: 'error',
      scope: 'api.saveSets',
      version: 'abc1234',
      clientTime: good.time,
    })
  })

  it('уровень info с браузера не нужен — отклоняем', () => {
    expect(parseEntry(JSON.stringify({ ...good, level: 'info' }))).toBeNull()
  })

  it('не JSON, пустое сообщение, слишком большое тело — отклоняем', () => {
    expect(parseEntry('не json')).toBeNull()
    expect(parseEntry(JSON.stringify({ ...good, message: '' }))).toBeNull()
    expect(parseEntry('x'.repeat(9000))).toBeNull()
  })

  it('длинные поля обрезаются, объект в details превращается в строку', () => {
    const entry = parseEntry(
      JSON.stringify({ ...good, message: 'м'.repeat(900), details: { code: '23514' } }),
    )
    expect(entry?.message).toHaveLength(500)
    expect(entry?.details).toBe('{"code":"23514"}')
  })
})

describe('POST /api/log — запись в журнал Vercel', () => {
  it('ошибка браузера попадает в журнал одной строкой JSON', async () => {
    const written = vi.spyOn(console, 'error').mockImplementation(() => {})

    const response = await POST(
      new Request('http://x/api/log', { method: 'POST', body: JSON.stringify(good) }),
    )

    expect(response.status).toBe(204)
    const line = JSON.parse(String(written.mock.calls[0][0]))
    expect(line).toMatchObject({
      level: 'error',
      scope: 'client',
      clientScope: 'api.saveSets',
      version: 'abc1234',
    })
  })

  it('мусор — ответ 400 и предупреждение в журнале', async () => {
    const warned = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const response = await POST(new Request('http://x/api/log', { method: 'POST', body: '{}' }))

    expect(response.status).toBe(400)
    expect(String(warned.mock.calls[0][0])).toContain('client-log')
  })
})
