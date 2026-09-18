import { describe, expect, it } from 'vitest'
import { formatDate, formatDelta, formatLastTime, formatSet } from '@/lib/format'

describe('formatSet и formatLastTime', () => {
  it('показывает вес и повторы, а нулевой вес — как работу своим весом', () => {
    expect(formatSet({ kg: 12, reps: 10 })).toBe('12 кг × 10')
    expect(formatSet({ kg: 0, reps: 15 })).toBe('своим весом × 15')
  })

  it('склеивает подходы прошлой тренировки, а на пустой истории даёт пустую строку', () => {
    expect(
      formatLastTime([
        { kg: 12, reps: 10 },
        { kg: 14, reps: 8 },
      ]),
    ).toBe('12 кг × 10 · 14 кг × 8')
    expect(formatLastTime([])).toBe('')
  })
})

describe('formatDate и formatDelta', () => {
  it('переводит ISO-дату в русский вид', () => {
    expect(formatDate('2026-08-01')).toBe('1 августа 2026')
  })

  it('возвращает исходную строку, если дата некорректна', () => {
    expect(formatDate('не дата')).toBe('не дата')
  })

  it('показывает динамику со знаком и отдельно случай без изменений', () => {
    expect(formatDelta(60.8, 61.5, 'кг')).toBe('−0,7 кг')
    expect(formatDelta(70, 69, 'см')).toBe('+1 см')
    expect(formatDelta(96, 96, 'см')).toBe('без изменений')
  })
})
