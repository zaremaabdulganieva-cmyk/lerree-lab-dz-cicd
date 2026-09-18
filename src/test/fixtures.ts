/**
 * Данные для тестов.
 *
 * Раньше тесты брали демо-данные из mock.ts. Теперь приложение ходит
 * в настоящую базу, а тестам нужен свой, независимый набор — иначе
 * тесты начнут падать от правки контента в базе.
 */

import type { Material, Measurement, Program } from '@/lib/types'

export const TEST_PROGRAM: Program = {
  id: 'p-1',
  title: 'Сила и форма · базовый цикл',
  description: 'Три тренировки в неделю.',
  weeks: 8,
  currentWeek: 3,
  workouts: [
    {
      id: 'w-1',
      title: 'Ноги и ягодицы',
      day: 'Понедельник',
      durationMin: 45,
      focus: 'Низ тела',
      exercises: [
        {
          id: 'e-1',
          title: 'Приседания с гантелями',
          hint: 'Спина ровная',
          plannedSets: 2,
          repsRange: '10–12',
          lastTime: [{ kg: 12, reps: 12 }],
          hasVideo: true,
        },
      ],
    },
  ],
}

export const TEST_MATERIALS: Material[] = [
  {
    id: 'm-1',
    title: 'Как подобрать рабочий вес',
    kind: 'article',
    excerpt: 'Правило двух повторов в запасе.',
    tags: ['тренировки', 'новичкам'],
    minutes: 5,
  },
  {
    id: 'm-2',
    title: 'Белковый завтрак за 10 минут',
    kind: 'recipe',
    excerpt: 'Омлет с творогом и зеленью.',
    tags: ['питание', 'завтрак'],
    minutes: 10,
  },
  {
    id: 'm-3',
    title: 'Подкаст: восстановление и сон',
    kind: 'podcast',
    excerpt: 'Почему без сна не растёт сила.',
    tags: ['восстановление', 'сон'],
    minutes: 24,
  },
]

export const TEST_MEASUREMENTS: Measurement[] = [
  { id: 'ms-1', date: '2026-06-01', weightKg: 62.4, waistCm: 72, hipsCm: 98 },
  { id: 'ms-2', date: '2026-07-01', weightKg: 61.5, waistCm: 70.5, hipsCm: 97 },
  { id: 'ms-3', date: '2026-08-01', weightKg: 60.8, waistCm: 69, hipsCm: 96 },
]
