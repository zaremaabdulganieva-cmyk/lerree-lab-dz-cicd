/**
 * Проверка слоя запросов к базе.
 *
 * Настоящий Supabase здесь не нужен: вместо него подставлен клиент-
 * двойник. Он отвечает заранее заданными строками — так можно проверить
 * и удачные ответы, и ошибки сервера, которые вживую поймать трудно
 * (истёкшая сессия, дубль записи, обрыв связи).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// --- клиент-двойник ---------------------------------------------------

interface TableResult {
  data?: unknown
  error?: unknown
}

/** Что именно запрашивали — по этим записям проверяем порядок действий. */
let calls: Array<{ table: string; op: string; payload?: unknown }> = []
let tables: Record<string, TableResult> = {}
let session: { user: { id: string; email: string } } | null = null

function builder(table: string) {
  const result = () => tables[table] ?? { data: [], error: null }

  const query: Record<string, unknown> = {
    select: () => query,
    eq: () => query,
    order: () => query,
    limit: () => query,
    returns: () => Promise.resolve(result()),
    maybeSingle: () => Promise.resolve(result()),
    insert: (payload: unknown) => {
      calls.push({ table, op: 'insert', payload })
      return query
    },
    delete: () => {
      calls.push({ table, op: 'delete' })
      return query
    },
    // Запрос можно просто «дождаться» — как это делает supabase-js.
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result()).then(resolve, reject),
  }

  return query
}

const fakeClient = {
  from: (table: string) => {
    calls.push({ table, op: 'from' })
    return builder(table)
  },
  auth: {
    getSession: () => Promise.resolve({ data: { session }, error: null }),
    signInWithPassword: () =>
      Promise.resolve({ data: { user: session?.user ?? null }, error: null }),
    signOut: () => Promise.resolve({ error: null }),
  },
}

vi.mock('@/lib/supabase', () => ({
  getSupabase: () => fakeClient,
  isConfigured: () => true,
}))

const { fetchMeasurements, fetchProgram, saveMeasurement, saveSets, setOffline, fetchSavedSets } =
  await import('@/lib/api')

beforeEach(() => {
  calls = []
  tables = {}
  session = { user: { id: 'user-anna', email: 'anna@demo.ru' } }
  setOffline(false)
})

afterEach(() => setOffline(false))

// --- сами проверки ----------------------------------------------------

describe('чтение данных', () => {
  it('переводит колонки базы в поля приложения и числа — в числа', async () => {
    tables.measurements = {
      data: [
        {
          id: 'ms-1',
          measured_on: '2026-08-01',
          weight_kg: '60.80',
          waist_cm: '69',
          hips_cm: '96',
        },
      ],
      error: null,
    }

    const result = await fetchMeasurements()

    expect(result).toEqual([
      { id: 'ms-1', date: '2026-08-01', weightKg: 60.8, waistCm: 69, hipsCm: 96 },
    ])
  })

  it('раскладывает тренировки и упражнения по порядку и добавляет «в прошлый раз»', async () => {
    tables.programs = {
      data: [
        {
          id: 'p-1',
          title: 'Базовый цикл',
          description: '',
          weeks: 8,
          current_week: 3,
          workouts: [
            {
              id: 'w-2',
              title: 'Верх',
              day_label: 'Среда',
              duration_min: 40,
              focus: '',
              position: 2,
              exercises: [],
            },
            {
              id: 'w-1',
              title: 'Ноги',
              day_label: 'Понедельник',
              duration_min: 45,
              focus: '',
              position: 1,
              exercises: [
                {
                  id: 'e-2',
                  title: 'Мост',
                  hint: '',
                  planned_sets: 3,
                  reps_range: '',
                  has_video: false,
                  position: 2,
                },
                {
                  id: 'e-1',
                  title: 'Присед',
                  hint: '',
                  planned_sets: 4,
                  reps_range: '',
                  has_video: true,
                  position: 1,
                },
              ],
            },
          ],
        },
      ],
      error: null,
    }
    tables.last_workout_sets = {
      data: [
        { exercise_id: 'e-1', set_index: 2, kg: '14', reps: 10 },
        { exercise_id: 'e-1', set_index: 1, kg: '12', reps: 12 },
      ],
      error: null,
    }

    const program = await fetchProgram()

    expect(program?.workouts.map((w) => w.title)).toEqual(['Ноги', 'Верх'])
    expect(program?.workouts[0].exercises.map((e) => e.title)).toEqual(['Присед', 'Мост'])
    expect(program?.workouts[0].exercises[0].lastTime).toEqual([
      { kg: 12, reps: 12 },
      { kg: 14, reps: 10 },
    ])
  })

  it('возвращает null, когда программы нет — экран покажет объяснение, а не ошибку', async () => {
    tables.programs = { data: [], error: null }
    await expect(fetchProgram()).resolves.toBeNull()
  })
})

describe('запись данных', () => {
  it('подставляет к замеру участницу из сессии', async () => {
    tables.measurements = { data: [], error: null }

    await saveMeasurement({ date: '2026-09-01', weightKg: 60.1, waistCm: 68, hipsCm: 95 })

    const insert = calls.find((call) => call.op === 'insert')
    expect(insert?.payload).toMatchObject({ user_id: 'user-anna', measured_on: '2026-09-01' })
  })

  it('перед записью подходов удаляет сегодняшние — иначе лишний подход остался бы навсегда', async () => {
    tables.workout_sets = { data: [], error: null }

    await saveSets('e-1', [{ kg: 12, reps: 10 }])

    const order = calls.filter((call) => call.op !== 'from').map((call) => call.op)
    expect(order).toEqual(['delete', 'insert'])
  })

  it('нумерует подходы по порядку', async () => {
    tables.workout_sets = { data: [], error: null }

    await saveSets('e-1', [
      { kg: 12, reps: 12 },
      { kg: 14, reps: 10 },
    ])

    const insert = calls.find((call) => call.op === 'insert')
    expect(insert?.payload).toMatchObject([{ set_index: 1 }, { set_index: 2 }])
  })
})

describe('ошибки сервера', () => {
  it('дубль замера на ту же дату объясняет, что делать', async () => {
    tables.measurements = { data: null, error: { code: '23505', message: 'duplicate key' } }

    await expect(
      saveMeasurement({ date: '2026-09-01', weightKg: 60, waistCm: 68, hipsCm: 95 }),
    ).rejects.toMatchObject({
      kind: 'conflict',
      message: expect.stringContaining('уже есть'),
    })
  })

  it('несуществующее значение отклоняется базой и объясняется человеку', async () => {
    tables.measurements = { data: null, error: { code: '23514', message: 'check constraint' } }

    await expect(
      saveMeasurement({ date: '2026-09-01', weightKg: 500, waistCm: 68, hipsCm: 95 }),
    ).rejects.toMatchObject({ kind: 'validation' })
  })

  it('без сессии не делает запрос и просит войти заново', async () => {
    session = null

    await expect(fetchMeasurements()).rejects.toMatchObject({
      kind: 'auth',
      message: expect.stringContaining('Войдите заново'),
    })
    expect(calls.filter((call) => call.table === 'measurements')).toHaveLength(0)
  })

  it('при выключенной сети запрос не уходит вовсе', async () => {
    setOffline(true)

    await expect(fetchSavedSets()).rejects.toMatchObject({ kind: 'network' })
    expect(calls).toHaveLength(0)
  })
})
