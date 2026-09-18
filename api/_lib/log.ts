/**
 * Серверный журнал в формате JSON — одна строка на событие.
 *
 * Vercel собирает всё, что функции пишут в консоль, в раздел Logs.
 * Строка-JSON там разбирается на поля: можно отфильтровать по уровню,
 * месту или коду ошибки, а не искать глазами по тексту.
 */

export type Level = 'info' | 'warn' | 'error'

export function log(level: Level, scope: string, message: string, extra: object = {}): void {
  const line = JSON.stringify({
    time: new Date().toISOString(),
    level,
    scope,
    message,
    ...extra,
  })
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}
