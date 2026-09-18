/** Доменные типы демо-кабинета. Повторяют структуру данных боевого Lerree Lab. */

export type Role = 'member' | 'admin'

export type SubscriptionStatus = 'active' | 'expired'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  subscription: SubscriptionStatus
  /** Дата окончания подписки в формате ISO (YYYY-MM-DD). */
  subscriptionUntil: string
}

/** Один подход упражнения: рабочий вес и число повторов. */
export interface SetEntry {
  kg: number
  reps: number
}

export interface Exercise {
  id: string
  title: string
  /** Подсказка по технике — короткая строка под названием. */
  hint: string
  /** Сколько подходов запланировано тренером. */
  plannedSets: number
  /** Рекомендованный диапазон повторов, например «10–12». */
  repsRange: string
  /** Значения прошлой тренировки — показываются как ориентир. */
  lastTime: SetEntry[]
  /** Есть ли видео-разбор техники. */
  hasVideo: boolean
}

export interface Workout {
  id: string
  title: string
  /** День недели по плану программы. */
  day: string
  /** Ориентировочная длительность в минутах. */
  durationMin: number
  focus: string
  exercises: Exercise[]
}

export interface Program {
  id: string
  title: string
  description: string
  weeks: number
  currentWeek: number
  workouts: Workout[]
}

export type MaterialKind = 'article' | 'recipe' | 'podcast' | 'live'

export interface Material {
  id: string
  title: string
  kind: MaterialKind
  /** Краткое описание — участвует в поиске наравне с названием и тегами. */
  excerpt: string
  tags: string[]
  minutes: number
}

/** Личный замер участницы: вес и объёмы на конкретную дату. */
export interface Measurement {
  id: string
  /** Дата замера в формате ISO (YYYY-MM-DD). */
  date: string
  weightKg: number
  waistCm: number
  hipsCm: number
}

/** Замер до сохранения: идентификатор выдаёт база, а не приложение. */
export type MeasurementInput = Omit<Measurement, 'id'>

/** Черновик замера из формы — значения приходят строками из полей ввода. */
export interface MeasurementDraft {
  date: string
  weightKg: string
  waistCm: string
  hipsCm: string
}
