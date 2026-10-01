/**
 * Яндекс.Метрика: просмотры страниц и цели.
 *
 * Счётчик подключается только на боевом адресе — локальная разработка,
 * тесты и превью PR не засоряют статистику. Код счётчика не вставлен в
 * index.html строкой, а загружается отсюда: так он подчиняется CSP
 * (script-src разрешает только mc.yandex.ru, без inline-скриптов).
 *
 * Кабинет — одностраничное приложение: при переходе между разделами
 * страница не перезагружается, и сама Метрика этого не видит. Поэтому
 * просмотр отправляется вручную при каждой смене адреса (trackPage).
 *
 * Номер счётчика не секрет: он виден в коде любой страницы с Метрикой.
 */

import { log } from '@/lib/logger'

export const METRIKA_ID = 113255243
const PRODUCTION_HOST = 'lerree-lab-dz-cicd.vercel.app'

/** Цели — ключевые действия участницы. Те же имена заведены в Метрике. */
export type Goal =
  | 'login_password' // вошла по паролю
  | 'login_google_start' // нажала «Войти через Google»
  | 'login_google_success' // вернулась от Google уже вошедшей
  | 'login_google_error' // Google вернул ошибку (отмена, устаревшая ссылка)
  | 'login_error' // неверный пароль, нет связи
  | 'workout_sets_saved' // сохранила подходы тренировки
  | 'measurement_saved' // сохранила замер
  | 'subscription_extend_click' // нажала «Продлить подписку»

type Ym = ((id: number, method: string, ...args: unknown[]) => void) & { a?: unknown[][] }

declare global {
  interface Window {
    ym?: Ym
  }
}

let enabled = false

/** Можно ли слать данные: только боевой адрес и только в браузере. */
export function shouldTrack(hostname: string): boolean {
  return hostname === PRODUCTION_HOST
}

/** Подключает счётчик. Вызывается один раз при старте приложения; hostname — для тестов. */
export function initAnalytics(hostname = window.location.hostname): void {
  if (enabled || !shouldTrack(hostname)) return
  enabled = true

  // Очередь вызовов: всё, что отправлено до загрузки tag.js, Метрика
  // заберёт сама, когда загрузится. Это официальная схема их кода.
  const queue: Ym = (...args) => {
    ;(queue.a ??= []).push(args)
  }
  window.ym = window.ym ?? queue

  const script = document.createElement('script')
  script.src = `https://mc.yandex.ru/metrika/tag.js?id=${METRIKA_ID}`
  script.async = true
  script.onerror = () => log.warn('analytics', 'Метрика не загрузилась (блокировщик рекламы?)')
  document.head.appendChild(script)

  window.ym(METRIKA_ID, 'init', {
    // Первый просмотр отправим сами из trackPage — иначе он задвоится.
    defer: true,
    webvisor: true,
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true,
  })
}

/** Просмотр страницы — при каждой смене адреса внутри кабинета. */
export function trackPage(path: string, referrer?: string): void {
  if (!enabled || !window.ym) return
  window.ym(METRIKA_ID, 'hit', `${window.location.origin}${path}`, {
    referer: referrer ? `${window.location.origin}${referrer}` : document.referrer,
  })
}

/** Цель. Параметры — то, что помогает разобраться, без личных данных. */
export function reachGoal(goal: Goal, params?: Record<string, string | number>): void {
  if (!enabled || !window.ym) return
  window.ym(METRIKA_ID, 'reachGoal', goal, params)
}
