import type { MaterialKind, SetEntry } from '@/lib/types'

/** Показывает подход в карточке упражнения: «12 кг × 10» или «своим весом × 15». */
export function formatSet(set: SetEntry): string {
  const weight = set.kg === 0 ? 'своим весом' : `${formatNumber(set.kg)} кг`
  return `${weight} × ${set.reps}`
}

/** Подсказка «в прошлый раз» для упражнения; пустая строка, если истории ещё нет. */
export function formatLastTime(sets: SetEntry[]): string {
  if (sets.length === 0) return ''
  return sets.map(formatSet).join(' · ')
}

/** Число в русской записи: 60.8 → «60,8». Точка в десятичной части выглядит чужеродно. */
export function formatNumber(value: number): string {
  return value.toLocaleString('ru-RU')
}

/** Дата в человеческом виде: 2026-08-01 → «1 августа 2026». */
export function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  // Хвост «г.» из локали ru-RU в интерфейсе лишний — убираем.
  return date
    .toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    .replace(' г.', '')
}

/** Разница между двумя значениями со знаком: «−0,7 кг», «+1,2 см», «без изменений». */
export function formatDelta(current: number, previous: number, unit: string): string {
  const diff = Number((current - previous).toFixed(1))
  if (diff === 0) return 'без изменений'
  const sign = diff > 0 ? '+' : '−'
  return `${sign}${Math.abs(diff).toLocaleString('ru-RU')} ${unit}`
}

const KIND_LABELS: Record<MaterialKind, string> = {
  article: 'Статья',
  recipe: 'Рецепт',
  podcast: 'Подкаст',
  live: 'Эфир',
}

/** Человеческое название типа материала для бейджа на карточке. */
export function materialKindLabel(kind: MaterialKind): string {
  return KIND_LABELS[kind]
}
