/**
 * Журнал событий приложения — одна запись JSON на событие.
 *
 * Зачем отдельный модуль, а не console.log по коду: у всех записей один
 * формат и общий буфер последних событий. Когда участница пишет «ничего
 * не сохраняется», в консоли браузера видна вся цепочка — какой запрос,
 * к какой таблице, с какой ошибкой.
 *
 * Предупреждения и ошибки ещё и уходят на сервер (/api/log) и попадают
 * в журнал Vercel рядом с серверными записями — это и есть общее
 * хранилище: ошибку участницы видно, даже если она ничего не написала.
 */

export type LogLevel = 'info' | 'warn' | 'error'

export interface LogEntry {
  time: string
  level: LogLevel
  /** Где случилось: 'api.saveSets', 'auth.google' и т.п. */
  scope: string
  message: string
  details?: unknown
  /** Какая сборка: короткий хеш коммита. По нему ошибку сверяют с кодом. */
  version: string
  /** Случайный номер вкладки: связывает записи одного сеанса между собой. */
  session: string
}

const BUFFER_LIMIT = 50
/** Сколько записей одна вкладка может отправить на сервер — защита от лавины. */
const SHIP_LIMIT = 20

const buffer: LogEntry[] = []
const session = Math.random().toString(36).slice(2, 10)
let shipped = 0

function ship(entry: LogEntry): void {
  // В разработке и в тестах сервера нет — отправлять некуда.
  if (import.meta.env.DEV || import.meta.env.MODE === 'test') return
  if (shipped >= SHIP_LIMIT || typeof navigator === 'undefined' || !navigator.sendBeacon) return
  shipped += 1

  const payload = JSON.stringify({ ...entry, path: window.location.pathname })
  // sendBeacon доставляет запись, даже если вкладку тут же закрыли.
  navigator.sendBeacon('/api/log', new Blob([payload], { type: 'application/json' }))
}

function push(level: LogLevel, scope: string, message: string, details?: unknown): void {
  const entry: LogEntry = {
    time: new Date().toISOString(),
    level,
    scope,
    message,
    ...(details === undefined || details === '' ? {} : { details }),
    version: __APP_VERSION__,
    session,
  }

  buffer.push(entry)
  if (buffer.length > BUFFER_LIMIT) buffer.shift()

  const line = JSON.stringify(entry)
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.info(line)

  if (level !== 'info') ship(entry)
}

export const log = {
  info: (scope: string, message: string, details?: unknown) =>
    push('info', scope, message, details),
  warn: (scope: string, message: string, details?: unknown) =>
    push('warn', scope, message, details),
  error: (scope: string, message: string, details?: unknown) =>
    push('error', scope, message, details),
}

/** Последние события — их удобно попросить прислать при разборе жалобы. */
export function recentLogs(): LogEntry[] {
  return [...buffer]
}

export function clearLogs(): void {
  buffer.length = 0
}
