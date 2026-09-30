/**
 * POST /api/log — приёмник ошибок из браузера.
 *
 * Кабинет отправляет сюда свои предупреждения и ошибки, а функция пишет
 * их в журнал Vercel тем же JSON, что и серверные записи. Так весь
 * журнал — сервер и браузеры участниц — лежит в одном месте и
 * фильтруется по уровню, месту и версии сборки.
 *
 * Адрес открыт всем, поэтому принимаем только то, что похоже на запись
 * нашего журнала, и обрезаем всё длинное: мусором журнал не забить.
 */

import { log } from './_lib/log.js'

const MAX_BODY = 8 * 1024
const MAX_TEXT = 500
const MAX_DETAILS = 2000

type ClientLevel = 'warn' | 'error'

export interface ClientEntry {
  level: ClientLevel
  scope: string
  message: string
  details?: string
  version?: string
  session?: string
  path?: string
  clientTime?: string
}

const cut = (value: unknown, limit: number): string | undefined =>
  typeof value === 'string' ? value.slice(0, limit) : undefined

/** Разбирает тело запроса. null — это не запись журнала, пишем отказ. */
export function parseEntry(raw: string): ClientEntry | null {
  if (raw.length > MAX_BODY) return null

  let body: Record<string, unknown>
  try {
    body = JSON.parse(raw) as Record<string, unknown>
  } catch {
    return null
  }
  if (typeof body !== 'object' || body === null) return null

  const level = body.level
  if (level !== 'warn' && level !== 'error') return null

  const scope = cut(body.scope, 100)
  const message = cut(body.message, MAX_TEXT)
  if (!scope || !message) return null

  const details =
    body.details === undefined
      ? undefined
      : (typeof body.details === 'string' ? body.details : JSON.stringify(body.details)).slice(
          0,
          MAX_DETAILS,
        )

  return {
    level,
    scope,
    message,
    details,
    version: cut(body.version, 20),
    session: cut(body.session, 20),
    path: cut(body.path, 200),
    clientTime: cut(body.time, 40),
  }
}

export async function POST(request: Request): Promise<Response> {
  const entry = parseEntry(await request.text())

  if (!entry) {
    log('warn', 'client-log', 'отклонена запись неверного формата')
    return new Response(null, { status: 400 })
  }

  // scope браузера кладём в clientScope: общий scope у всех записей
  // отсюда — 'client', чтобы в Vercel одним фильтром найти все ошибки браузеров.
  const { level, message, scope, ...rest } = entry
  log(level, 'client', message, { clientScope: scope, ...rest })
  return new Response(null, { status: 204 })
}
