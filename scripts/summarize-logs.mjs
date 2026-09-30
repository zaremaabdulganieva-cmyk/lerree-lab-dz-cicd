#!/usr/bin/env node
/**
 * Сводка по журналу перед разбором ИИ.
 *
 * Журнал Vercel выгружается в файл (Logs → Export или `vercel logs --json`),
 * по строке JSON на запись. Скрипт считает записи по уровню и месту и
 * группирует одинаковые ошибки — ИИ получает не тысячу строк, а короткую
 * картину и примеры, и не тратит внимание на повторы.
 *
 *   node scripts/summarize-logs.mjs docs/log-analysis/sample-incident.jsonl
 */
import { readFileSync } from 'node:fs'

const file = process.argv[2]
if (!file) {
  console.error('Укажите файл журнала: node scripts/summarize-logs.mjs <файл.jsonl>')
  process.exit(1)
}

const entries = readFileSync(file, 'utf8')
  .split('\n')
  .filter(Boolean)
  .flatMap((line) => {
    try {
      return [JSON.parse(line)]
    } catch {
      return []
    }
  })

const byLevel = {}
const groups = new Map()
for (const entry of entries) {
  byLevel[entry.level] = (byLevel[entry.level] ?? 0) + 1
  if (entry.level === 'info') continue
  const place = entry.clientScope ? `${entry.scope}/${entry.clientScope}` : entry.scope
  const key = `${entry.level} · ${place} · ${String(entry.details ?? entry.message).slice(0, 80)}`
  const group = groups.get(key) ?? {
    count: 0,
    first: entry.time,
    last: entry.time,
    sessions: new Set(),
  }
  group.count += 1
  group.last = entry.time
  if (entry.session) group.sessions.add(entry.session)
  groups.set(key, group)
}

console.log(
  `Записей: ${entries.length} · ${Object.entries(byLevel)
    .map(([l, n]) => `${l}: ${n}`)
    .join(' · ')}`,
)
console.log(`Период: ${entries[0]?.time} — ${entries.at(-1)?.time}\n`)
console.log('Предупреждения и ошибки, сгруппированные:')
for (const [key, g] of [...groups].sort((a, b) => b[1].count - a[1].count)) {
  const sessions = g.sessions.size ? ` · вкладок: ${g.sessions.size}` : ''
  console.log(
    `  ×${g.count}  ${key}  (${g.first.slice(11, 19)}–${g.last.slice(11, 19)}${sessions})`,
  )
}
