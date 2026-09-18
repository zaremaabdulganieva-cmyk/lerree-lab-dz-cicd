import { beforeEach, describe, expect, it } from 'vitest'
import { ApiError, toApiError } from '@/lib/errors'
import { clearLogs, recentLogs } from '@/lib/logger'

/**
 * Проверяем, что технический ответ сервера превращается в понятную
 * фразу — и что сам код при этом не теряется, а уходит в журнал.
 */
beforeEach(() => clearLogs())

describe('toApiError — перевод ошибок сервера', () => {
  it('обрыв связи распознаётся по типу ошибки браузера', () => {
    const error = toApiError(new TypeError('Failed to fetch'), 'test')

    expect(error.kind).toBe('network')
    expect(error.message).toMatch(/Нет связи с сервером/)
  })

  it('проверка значения в базе (23514) объясняется человеку', () => {
    const error = toApiError({ code: '23514', message: 'violates check constraint' }, 'test')

    expect(error.kind).toBe('validation')
    expect(error.message).toMatch(/выходит за разумные пределы/)
  })

  it('дубль записи (23505) предлагает изменить дату', () => {
    const error = toApiError({ code: '23505', message: 'duplicate key' }, 'test')

    expect(error.kind).toBe('conflict')
    expect(error.message).toMatch(/уже есть/)
  })

  it('истёкший токен (PGRST301) просит войти заново', () => {
    expect(toApiError({ code: 'PGRST301' }, 'test').kind).toBe('auth')
  })

  it('коды ответа 401 и 403 различаются по смыслу', () => {
    expect(toApiError({ status: 401 }, 'test').kind).toBe('auth')
    expect(toApiError({ status: 403 }, 'test').kind).toBe('forbidden')
  })

  it('500-е коды не пугают участницу техническими подробностями', () => {
    const error = toApiError({ status: 500, message: 'internal error' }, 'test')

    expect(error.kind).toBe('server')
    expect(error.message).not.toMatch(/internal/)
  })

  it('слишком частые запросы (429) просят подождать', () => {
    expect(toApiError({ status: 429 }, 'test').message).toMatch(/Подождите/)
  })

  it('незнакомая ошибка не остаётся без ответа', () => {
    const error = toApiError({ message: 'что-то новое' }, 'test')

    expect(error.kind).toBe('server')
    expect(error.message.length).toBeGreaterThan(10)
  })

  it('уже разобранная ошибка не переводится второй раз', () => {
    const original = new ApiError('forbidden', 'Доступ закрыт.', '42501')
    expect(toApiError(original, 'test')).toBe(original)
  })

  it('технический код сохраняется в журнале для разбора', () => {
    toApiError({ code: '23514', message: 'violates check constraint', status: 400 }, 'api.test')

    const entry = recentLogs().at(-1)
    expect(entry?.scope).toBe('api.test')
    expect(String(entry?.details)).toContain('23514')
  })
})
