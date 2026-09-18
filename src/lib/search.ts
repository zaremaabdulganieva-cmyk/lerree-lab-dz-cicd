import type { Material } from '@/lib/types'

/**
 * Ищет материалы по названию, описанию и тегам — регистр и лишние пробелы не важны.
 * Пустой запрос возвращает исходный список: поиск не должен «прятать» контент.
 */
export function filterMaterials(materials: Material[], query: string): Material[] {
  const needle = query.trim().toLowerCase()
  if (needle === '') return materials

  return materials.filter((material) => {
    const haystack = [material.title, material.excerpt, ...material.tags].join(' ').toLowerCase()
    return haystack.includes(needle)
  })
}
