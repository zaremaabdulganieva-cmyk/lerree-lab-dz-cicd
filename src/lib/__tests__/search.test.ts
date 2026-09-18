import { describe, expect, it } from 'vitest'
import { filterMaterials } from '@/lib/search'
import { TEST_MATERIALS } from '@/test/fixtures'

describe('filterMaterials — поиск по материалам', () => {
  it('пустой запрос возвращает весь список', () => {
    expect(filterMaterials(TEST_MATERIALS, '')).toHaveLength(TEST_MATERIALS.length)
    expect(filterMaterials(TEST_MATERIALS, '   ')).toHaveLength(TEST_MATERIALS.length)
  })

  it('находит материал по названию без учёта регистра', () => {
    const found = filterMaterials(TEST_MATERIALS, 'РАБОЧИЙ ВЕС')
    expect(found).toHaveLength(1)
    expect(found[0].title).toBe('Как подобрать рабочий вес')
  })

  it('находит материалы по тегу', () => {
    const found = filterMaterials(TEST_MATERIALS, 'питание')
    expect(found.length).toBeGreaterThan(0)
    expect(found.every((item) => [...item.tags, item.excerpt].join(' ').includes('питание'))).toBe(
      true,
    )
  })

  it('возвращает пустой список, если совпадений нет', () => {
    expect(filterMaterials(TEST_MATERIALS, 'марафон')).toHaveLength(0)
  })
})
