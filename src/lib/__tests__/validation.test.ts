import { describe, expect, it } from 'vitest'
import { isSetValid, validateKg, validateMeasurement, validateReps } from '@/lib/validation'

describe('validateKg — вес снаряда', () => {
  it('принимает целые, дробные и записанные через запятую значения', () => {
    expect(validateKg('12').ok).toBe(true)
    expect(validateKg('12.5').ok).toBe(true)
    expect(validateKg('12,5').ok).toBe(true)
    // 0 — это работа с весом тела, тоже допустимо
    expect(validateKg('0').ok).toBe(true)
  })

  it('отклоняет отрицательный вес с понятной подсказкой', () => {
    const result = validateKg('-5')
    expect(result.ok).toBe(false)
    expect(result.ok === false && result.error).toMatch(/отрицательным/i)
  })

  it('отклоняет текст и пустое поле', () => {
    expect(validateKg('тяжело').ok).toBe(false)
    expect(validateKg('   ').ok).toBe(false)
  })
})

describe('validateReps — повторы', () => {
  it('принимает целое число повторов', () => {
    expect(validateReps('12').ok).toBe(true)
  })

  it('отклоняет дробное число и ноль', () => {
    expect(validateReps('10.5').ok).toBe(false)
    expect(validateReps('0').ok).toBe(false)
  })
})

describe('isSetValid — подход целиком', () => {
  it('считает подход валидным только когда корректны оба поля', () => {
    expect(isSetValid('12', '10')).toBe(true)
    expect(isSetValid('-1', '10')).toBe(false)
    expect(isSetValid('12', '0')).toBe(false)
  })
})

describe('validateMeasurement — форма замера', () => {
  it('собирает замер из корректного черновика', () => {
    const result = validateMeasurement({
      date: '2026-08-20',
      weightKg: '60,4',
      waistCm: '69',
      hipsCm: '96',
    })
    expect(result.ok).toBe(true)
    expect(result.ok === true && result.value.weightKg).toBe(60.4)
  })

  it('возвращает ошибки по каждому некорректному полю', () => {
    const result = validateMeasurement({
      date: '',
      weightKg: '0',
      waistCm: 'много',
      hipsCm: '96',
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.date).toBeDefined()
    expect(result.errors.weightKg).toBeDefined()
    expect(result.errors.waistCm).toBeDefined()
    expect(result.errors.hipsCm).toBeUndefined()
  })
})
