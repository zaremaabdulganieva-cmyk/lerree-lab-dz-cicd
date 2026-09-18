/**
 * Журнал событий приложения.
 *
 * Зачем отдельный модуль, а не console.log по коду: у всех записей один
 * формат и общий буфер последних событий. Когда участница пишет «ничего
 * не сохраняется», в консоли браузера видна вся цепочка — какой запрос,
 * к какой таблице, с какой ошибкой.
 *
 * Серверная часть логов живёт в Supabase (Logs → API / Postgres),
 * здесь — только клиентская сторона.
 */

export type LogLevel = 'info' | 'warn' | 'error'

export interface LogEntry {
  at: string
  level: LogLevel
  scope: string
  message: string
  details?: unknown
}

const BUFFER_LIMIT = 50
const buffer: LogEntry[] = []

function push(level: LogLevel, scope: string, message: string, details?: unknown): void {
  const entry: LogEntry = { at: new Date().toISOString(), level, scope, message, details }

  buffer.push(entry)
  if (buffer.length > BUFFER_LIMIT) buffer.shift()

  const line = `[${entry.at}] [${scope}] ${message}`
  if (level === 'error') console.error(line, details ?? '')
  else if (level === 'warn') console.warn(line, details ?? '')
  else console.info(line, details ?? '')
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
