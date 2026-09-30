import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearLogs, log, recentLogs } from '@/lib/logger'

/** Журнал браузера: одна строка JSON на событие, уровни и общий формат. */
describe('log — журнал браузера', () => {
  beforeEach(() => clearLogs())
  afterEach(() => vi.restoreAllMocks())

  it('пишет в консоль одну строку JSON со всеми полями', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})

    log.info('auth', 'сессия восстановлена', 'user-1')

    const line = JSON.parse(String(info.mock.calls[0][0]))
    expect(line).toMatchObject({
      level: 'info',
      scope: 'auth',
      message: 'сессия восстановлена',
      details: 'user-1',
      version: 'local',
    })
    expect(line.session).toMatch(/^[a-z0-9]+$/)
    expect(new Date(line.time).toString()).not.toBe('Invalid Date')
  })

  it('уровень выбирает метод консоли: warn → warn, error → error', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    log.warn('auth.google', 'вход отменён')
    log.error('api.saveSets', 'сервер не ответил')

    expect(warn).toHaveBeenCalledOnce()
    expect(error).toHaveBeenCalledOnce()
    expect(recentLogs().map((entry) => entry.level)).toEqual(['warn', 'error'])
  })

  it('пустые details в запись не попадают — журнал без шума', () => {
    vi.spyOn(console, 'info').mockImplementation(() => {})
    log.info('api.logout', 'выход выполнен')
    expect(recentLogs()[0]).not.toHaveProperty('details')
  })

  it('буфер держит только последние 50 событий', () => {
    vi.spyOn(console, 'info').mockImplementation(() => {})
    for (let i = 0; i < 60; i += 1) log.info('test', `событие ${i}`)
    expect(recentLogs()).toHaveLength(50)
    expect(recentLogs()[0].message).toBe('событие 10')
  })
})
