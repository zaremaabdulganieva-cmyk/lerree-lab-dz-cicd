import type { MeasurementDraft, MeasurementInput } from '@/lib/types'

/** Результат проверки одного поля: либо всё хорошо, либо текст ошибки для участницы. */
export type FieldResult = { ok: true } | { ok: false; error: string }

/** Разбирает строку из поля ввода в число, принимая и запятую как разделитель. */
export function parseNumber(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.')
  if (normalized === '') return null
  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}

/** Вес снаряда: неотрицательное число не больше 300 кг (0 — это работа с весом тела). */
export function validateKg(raw: string): FieldResult {
  const value = parseNumber(raw)
  if (value === null) return { ok: false, error: 'Введите число, например 12' }
  if (value < 0) return { ok: false, error: 'Вес не может быть отрицательным' }
  if (value > 300) return { ok: false, error: 'Проверьте вес — больше 300 кг маловероятно' }
  return { ok: true }
}

/** Повторы: целое число от 1 до 200. */
export function validateReps(raw: string): FieldResult {
  const value = parseNumber(raw)
  if (value === null) return { ok: false, error: 'Введите число, например 12' }
  if (!Number.isInteger(value)) return { ok: false, error: 'Повторы — целое число' }
  if (value < 1) return { ok: false, error: 'Должен быть хотя бы один повтор' }
  if (value > 200) return { ok: false, error: 'Проверьте повторы — больше 200 маловероятно' }
  return { ok: true }
}

/** Проверяет, что подход можно сохранить: оба поля заполнены и корректны. */
export function isSetValid(kg: string, reps: string): boolean {
  return validateKg(kg).ok && validateReps(reps).ok
}

export type MeasurementResult =
  | { ok: true; value: MeasurementInput }
  | { ok: false; errors: Partial<Record<keyof MeasurementDraft, string>> }

/**
 * Собирает замер из черновика формы, возвращая ошибки по каждому некорректному полю.
 *
 * Это первая линия проверки — быстрая, прямо в браузере. Вторая линия
 * стоит в самой базе (ограничения check), и обойти её нельзя даже
 * запросом мимо приложения.
 */
export function validateMeasurement(draft: MeasurementDraft): MeasurementResult {
  const errors: Partial<Record<keyof MeasurementDraft, string>> = {}

  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) {
    errors.date = 'Укажите дату замера'
  }

  const numericFields: Array<[keyof MeasurementDraft, string, string]> = [
    ['weightKg', draft.weightKg, 'вес'],
    ['waistCm', draft.waistCm, 'талию'],
    ['hipsCm', draft.hipsCm, 'бёдра'],
  ]

  for (const [field, raw, label] of numericFields) {
    const value = parseNumber(raw)
    if (value === null) errors[field] = `Введите ${label} числом`
    else if (value <= 0) errors[field] = 'Значение должно быть больше 0'
    else if (value > 400) errors[field] = 'Проверьте значение — оно слишком большое'
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors }

  return {
    ok: true,
    value: {
      date: draft.date,
      weightKg: parseNumber(draft.weightKg) as number,
      waistCm: parseNumber(draft.waistCm) as number,
      hipsCm: parseNumber(draft.hipsCm) as number,
    },
  }
}
