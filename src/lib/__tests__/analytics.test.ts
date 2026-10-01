import { beforeAll, describe, expect, it } from 'vitest'

/**
 * Метрика: на боевом адресе — счётчик и цели, везде остальном — тишина.
 * Модуль хранит состояние «включено», поэтому порядок тестов важен:
 * сначала проверяем выключенный режим, потом включаем.
 */

const { METRIKA_ID, initAnalytics, reachGoal, shouldTrack, trackPage } =
  await import('@/lib/analytics')

describe('Метрика вне боевого адреса', () => {
  it('на localhost и превью счётчик не подключается', () => {
    expect(shouldTrack('localhost')).toBe(false)
    expect(shouldTrack('lerree-lab-dz-cicd-m5aforoix-zarema-s-projects1.vercel.app')).toBe(false)

    initAnalytics('localhost')
    reachGoal('login_password')
    trackPage('/programs')

    expect(window.ym).toBeUndefined()
    expect(document.querySelector('script[src*="mc.yandex.ru"]')).toBeNull()
  })
})

describe('Метрика на боевом адресе', () => {
  beforeAll(() => initAnalytics('lerree-lab-dz-cicd.vercel.app'))

  it('загружает tag.js с нашим номером счётчика и инициализирует с Вебвизором', () => {
    const script = document.querySelector<HTMLScriptElement>('script[src*="mc.yandex.ru"]')
    expect(script?.src).toBe(`https://mc.yandex.ru/metrika/tag.js?id=${METRIKA_ID}`)
    expect(script?.async).toBe(true)

    const [id, method, options] = window.ym!.a![0]
    expect([id, method]).toEqual([METRIKA_ID, 'init'])
    expect(options).toMatchObject({ webvisor: true, clickmap: true, defer: true })
  })

  it('повторный вызов не подключает счётчик второй раз', () => {
    initAnalytics('lerree-lab-dz-cicd.vercel.app')
    expect(document.querySelectorAll('script[src*="mc.yandex.ru"]')).toHaveLength(1)
  })

  it('переход по разделам — отдельный просмотр с адресом и откуда пришли', () => {
    trackPage('/programs', '/login')
    const call = window.ym!.a!.at(-1)!
    expect(call[1]).toBe('hit')
    expect(call[2]).toBe(`${window.location.origin}/programs`)
    expect(call[3]).toEqual({ referer: `${window.location.origin}/login` })
  })

  it('цель уходит с параметрами, без личных данных', () => {
    reachGoal('workout_sets_saved', { sets: 3 })
    expect(window.ym!.a!.at(-1)).toEqual([
      METRIKA_ID,
      'reachGoal',
      'workout_sets_saved',
      { sets: 3 },
    ])
  })
})
