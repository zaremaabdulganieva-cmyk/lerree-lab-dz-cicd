/**
 * Слой обращения к базе — единственное место, где приложение говорит
 * с сервером. Экраны вызывают функции отсюда и ничего не знают ни про
 * Supabase, ни про названия колонок.
 *
 * Что здесь происходит с каждым запросом:
 *   1) проверяем, что участница вошла;
 *   2) делаем запрос;
 *   3) ошибку переводим на человеческий язык и пишем в журнал;
 *   4) отдаём данные в том виде, в котором их ждут экраны.
 */

import { ApiError, toApiError } from '@/lib/errors'
import { log } from '@/lib/logger'
import { getSupabase } from '@/lib/supabase'
import type {
  Material,
  MaterialKind,
  Measurement,
  MeasurementInput,
  Program,
  Role,
  SetEntry,
  SubscriptionStatus,
  User,
} from '@/lib/types'

export { ApiError } from '@/lib/errors'

// ---------------------------------------------------------------------
// Демо-переключатель «сеть выключена».
// Кнопка в шапке кабинета: позволяет показать обработку ошибок, не
// выдёргивая интернет. На настоящие запросы влияет только он сам —
// запрос просто не уходит.
// ---------------------------------------------------------------------
let offline = false

export function setOffline(value: boolean): void {
  offline = value
  log.info('api', value ? 'демо-режим: сеть выключена' : 'демо-режим: сеть включена')
}

export function isOffline(): boolean {
  return offline
}

function guardNetwork(): void {
  if (offline) {
    throw new ApiError(
      'network',
      'Нет связи с сервером. Проверьте интернет и повторите попытку.',
      'демо-переключатель «сеть выключена»',
    )
  }
}

// ---------------------------------------------------------------------
// Строки таблиц — ровно так, как они лежат в базе (с подчёркиваниями).
// Дальше их превращаем в доменные типы приложения.
// ---------------------------------------------------------------------
interface ProfileRow {
  user_id: string
  name: string
  role: Role
  subscription_status: SubscriptionStatus
  subscription_until: string
}

interface ExerciseRow {
  id: string
  title: string
  hint: string
  planned_sets: number
  reps_range: string
  has_video: boolean
  position: number
}

interface WorkoutRow {
  id: string
  title: string
  day_label: string
  duration_min: number
  focus: string
  position: number
  exercises: ExerciseRow[] | null
}

interface ProgramRow {
  id: string
  title: string
  description: string
  weeks: number
  current_week: number
  workouts: WorkoutRow[] | null
}

interface MaterialRow {
  id: string
  title: string
  kind: MaterialKind
  excerpt: string
  tags: string[] | null
  minutes: number
}

interface MeasurementRow {
  id: string
  measured_on: string
  weight_kg: number | string
  waist_cm: number | string
  hips_cm: number | string
}

interface SetRow {
  exercise_id: string
  set_index: number
  kg: number | string
  reps: number
}

/** Числовые колонки Postgres приходят строками — приводим к числу один раз здесь. */
function num(value: number | string): number {
  return typeof value === 'number' ? value : Number(value)
}

function byPosition<T extends { position: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.position - b.position)
}

/** Группирует подходы по упражнению и раскладывает их по порядку. */
function groupSets(rows: SetRow[]): SavedSets {
  const grouped: SavedSets = {}
  for (const row of [...rows].sort((a, b) => a.set_index - b.set_index)) {
    const list = grouped[row.exercise_id] ?? []
    list.push({ kg: num(row.kg), reps: row.reps })
    grouped[row.exercise_id] = list
  }
  return grouped
}

/** Сегодняшняя дата в том же виде, в каком её хранит база: 2026-09-10. */
function today(): string {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** Кто сейчас в приложении. Без действующей сессии запрос делать бессмысленно. */
async function requireUserId(): Promise<string> {
  const { data, error } = await getSupabase().auth.getSession()
  if (error) throw toApiError(error, 'api.session')

  const id = data.session?.user.id
  if (!id) {
    throw new ApiError('auth', 'Сессия истекла. Войдите заново.', 'нет активной сессии')
  }
  return id
}

// =====================================================================
// Вход и профиль
// =====================================================================

/** Профиль участницы по идентификатору из сессии. */
export async function fetchProfile(userId: string): Promise<User> {
  guardNetwork()

  const { data, error } = await getSupabase()
    .from('profiles')
    .select('user_id, name, role, subscription_status, subscription_until')
    .eq('user_id', userId)
    .maybeSingle<ProfileRow>()

  if (error) throw toApiError(error, 'api.fetchProfile')
  if (!data) {
    throw new ApiError(
      'notfound',
      'Карточка участницы не найдена. Напишите в поддержку клуба.',
      `profiles: нет строки для ${userId}`,
    )
  }

  return {
    id: data.user_id,
    name: data.name,
    email: '',
    role: data.role,
    subscription: data.subscription_status,
    subscriptionUntil: data.subscription_until,
  }
}

/** Вход по e-mail и паролю через Supabase Auth. */
export async function login(email: string, password: string): Promise<User> {
  guardNetwork()

  const { data, error } = await getSupabase().auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })

  if (error) {
    // Ответ «неверные данные» специально не уточняет, что именно не так:
    // иначе форму можно использовать для перебора существующих адресов.
    if (/invalid login credentials/i.test(error.message)) {
      throw new ApiError(
        'auth',
        'Не подходит e-mail или пароль. Проверьте раскладку и попробуйте снова.',
        error.message,
      )
    }
    if (/email not confirmed/i.test(error.message)) {
      throw new ApiError(
        'auth',
        'Адрес не подтверждён. Откройте письмо со ссылкой подтверждения.',
        error.message,
      )
    }
    throw toApiError(error, 'api.login')
  }

  const user = data.user
  if (!user) throw new ApiError('auth', 'Не удалось войти. Попробуйте ещё раз.', 'пустой ответ')

  log.info('api.login', 'вход выполнен', user.id)
  const profile = await fetchProfile(user.id)
  return { ...profile, email: user.email ?? email }
}

export async function logout(): Promise<void> {
  const { error } = await getSupabase().auth.signOut()
  if (error) throw toApiError(error, 'api.logout')
  log.info('api.logout', 'выход выполнен')
}

// =====================================================================
// Контент клуба
// =====================================================================

/**
 * Программа со всеми тренировками и упражнениями — одним запросом.
 * Подсказка «в прошлый раз» подмешивается из личной истории участницы.
 *
 * null означает «программы нет» (её не назначили или закрыт доступ) —
 * экран покажет объяснение вместо ошибки.
 */
export async function fetchProgram(): Promise<Program | null> {
  guardNetwork()
  await requireUserId()

  const { data, error } = await getSupabase()
    .from('programs')
    .select(
      `id, title, description, weeks, current_week,
       workouts ( id, title, day_label, duration_min, focus, position,
         exercises ( id, title, hint, planned_sets, reps_range, has_video, position ) )`,
    )
    .limit(1)
    .returns<ProgramRow[]>()

  if (error) throw toApiError(error, 'api.fetchProgram')

  const row = data?.[0]
  if (!row) {
    log.warn('api.fetchProgram', 'программа не найдена — возможно, закрыт доступ')
    return null
  }

  const lastSets = await fetchLastSets()

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    weeks: row.weeks,
    currentWeek: row.current_week,
    workouts: byPosition(row.workouts ?? []).map((workout) => ({
      id: workout.id,
      title: workout.title,
      day: workout.day_label,
      durationMin: workout.duration_min,
      focus: workout.focus,
      exercises: byPosition(workout.exercises ?? []).map((exercise) => ({
        id: exercise.id,
        title: exercise.title,
        hint: exercise.hint,
        plannedSets: exercise.planned_sets,
        repsRange: exercise.reps_range,
        hasVideo: exercise.has_video,
        lastTime: lastSets[exercise.id] ?? [],
      })),
    })),
  }
}

export async function fetchMaterials(): Promise<Material[]> {
  guardNetwork()
  await requireUserId()

  const { data, error } = await getSupabase()
    .from('materials')
    .select('id, title, kind, excerpt, tags, minutes')
    .order('created_at', { ascending: true })
    .returns<MaterialRow[]>()

  if (error) throw toApiError(error, 'api.fetchMaterials')

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    kind: row.kind,
    excerpt: row.excerpt,
    tags: row.tags ?? [],
    minutes: row.minutes,
  }))
}

// =====================================================================
// Замеры
// =====================================================================

export async function fetchMeasurements(): Promise<Measurement[]> {
  guardNetwork()
  const userId = await requireUserId()

  const { data, error } = await getSupabase()
    .from('measurements')
    .select('id, measured_on, weight_kg, waist_cm, hips_cm')
    .eq('user_id', userId)
    .order('measured_on', { ascending: true })
    .returns<MeasurementRow[]>()

  if (error) throw toApiError(error, 'api.fetchMeasurements')

  return (data ?? []).map((row) => ({
    id: row.id,
    date: row.measured_on,
    weightKg: num(row.weight_kg),
    waistCm: num(row.waist_cm),
    hipsCm: num(row.hips_cm),
  }))
}

/** Сохраняет замер и возвращает обновлённую историю по возрастанию даты. */
export async function saveMeasurement(input: MeasurementInput): Promise<Measurement[]> {
  guardNetwork()
  const userId = await requireUserId()

  const { error } = await getSupabase().from('measurements').insert({
    user_id: userId,
    measured_on: input.date,
    weight_kg: input.weightKg,
    waist_cm: input.waistCm,
    hips_cm: input.hipsCm,
  })

  if (error) throw toApiError(error, 'api.saveMeasurement')

  log.info('api.saveMeasurement', 'замер сохранён', input.date)
  return fetchMeasurements()
}

// =====================================================================
// Подходы на тренировке
// =====================================================================

export type SavedSets = Record<string, SetEntry[]>

/** Подходы, записанные сегодня: ими заполняются поля на карточках упражнений. */
export async function fetchSavedSets(): Promise<SavedSets> {
  guardNetwork()
  const userId = await requireUserId()

  const { data, error } = await getSupabase()
    .from('workout_sets')
    .select('exercise_id, set_index, kg, reps')
    .eq('user_id', userId)
    .eq('performed_on', today())
    .returns<SetRow[]>()

  if (error) throw toApiError(error, 'api.fetchSavedSets')
  return groupSets(data ?? [])
}

/** Подходы прошлой тренировки — подсказка «в прошлый раз». */
export async function fetchLastSets(): Promise<SavedSets> {
  guardNetwork()
  const userId = await requireUserId()

  const { data, error } = await getSupabase()
    .from('last_workout_sets')
    .select('exercise_id, set_index, kg, reps')
    .eq('user_id', userId)
    .returns<SetRow[]>()

  if (error) throw toApiError(error, 'api.fetchLastSets')
  return groupSets(data ?? [])
}

/**
 * Сохраняет подходы упражнения за сегодня.
 *
 * Сначала удаляем сегодняшние строки этого упражнения, потом пишем новые:
 * так участница может убрать лишний подход, а не только исправить цифры.
 */
export async function saveSets(exerciseId: string, sets: SetEntry[]): Promise<SavedSets> {
  guardNetwork()
  const userId = await requireUserId()
  const supabase = getSupabase()
  const day = today()

  const removed = await supabase
    .from('workout_sets')
    .delete()
    .eq('user_id', userId)
    .eq('exercise_id', exerciseId)
    .eq('performed_on', day)

  if (removed.error) throw toApiError(removed.error, 'api.saveSets')

  if (sets.length > 0) {
    const inserted = await supabase.from('workout_sets').insert(
      sets.map((set, index) => ({
        user_id: userId,
        exercise_id: exerciseId,
        performed_on: day,
        set_index: index + 1,
        kg: set.kg,
        reps: set.reps,
      })),
    )

    if (inserted.error) throw toApiError(inserted.error, 'api.saveSets')
  }

  log.info('api.saveSets', `сохранено подходов: ${sets.length}`, exerciseId)
  return fetchSavedSets()
}
