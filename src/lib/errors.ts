/**
 * Перевод ошибок сервера на человеческий язык.
 *
 * База и Supabase отвечают кодами вроде 23514 или PGRST301. Показывать
 * такое участнице нельзя, а терять — тем более: код нужен для разбора.
 * Поэтому у каждой ошибки две стороны: message — что видит человек,
 * technical — что уходит в журнал.
 */

import { log } from '@/lib/logger'

export type ErrorKind =
  | 'network' // связь не дошла до сервера
  | 'auth' // не вошли или сессия истекла
  | 'forbidden' // вошли, но доступа к этим данным нет
  | 'validation' // данные не прошли проверку
  | 'conflict' // такая запись уже есть
  | 'notfound' // данных нет
  | 'config' // приложение собрано без адреса базы
  | 'server' // сломалось на стороне сервера

export class ApiError extends Error {
  readonly kind: ErrorKind
  readonly technical: string

  constructor(kind: ErrorKind, message: string, technical = '') {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.technical = technical
  }
}

/** Форма ошибки, которую отдаёт supabase-js (и REST-слой PostgREST). */
interface RawError {
  message?: string
  code?: string
  status?: number
  details?: string
  hint?: string
}

function read(cause: unknown): RawError {
  if (typeof cause === 'object' && cause !== null) return cause as RawError
  return { message: String(cause) }
}

/** Похоже ли на «браузер не смог достучаться до сервера». */
function isNetworkFailure(raw: RawError, cause: unknown): boolean {
  const text = `${raw.message ?? ''}`
  return (
    cause instanceof TypeError ||
    /failed to fetch|networkerror|network request failed|load failed/i.test(text)
  )
}

const BY_PG_CODE: Record<string, { kind: ErrorKind; message: string }> = {
  // Нарушено ограничение check — например, вес 500 кг или 0 повторов.
  '23514': {
    kind: 'validation',
    message: 'Значение выходит за разумные пределы. Проверьте, что ввели.',
  },
  // Дубль по уникальному ключу — второй замер на ту же дату.
  '23505': {
    kind: 'conflict',
    message: 'Запись на эту дату уже есть. Измените дату или отредактируйте существующую.',
  },
  // Ссылка на несуществующую строку — например, упражнение удалили.
  '23503': {
    kind: 'validation',
    message: 'Данные устарели: обновите страницу и повторите.',
  },
  // Нет прав на операцию (сработала защита в базе).
  '42501': {
    kind: 'forbidden',
    message: 'Это действие недоступно с вашим уровнем доступа.',
  },
  // Токен доступа истёк.
  PGRST301: {
    kind: 'auth',
    message: 'Сессия истекла. Войдите заново.',
  },
  // Ожидали одну строку, а её нет.
  PGRST116: {
    kind: 'notfound',
    message: 'Данные не найдены.',
  },
}

const BY_HTTP_STATUS: Record<number, { kind: ErrorKind; message: string }> = {
  400: { kind: 'validation', message: 'Сервер не принял данные. Проверьте заполненные поля.' },
  401: { kind: 'auth', message: 'Нужно войти заново — сессия больше не действует.' },
  403: { kind: 'forbidden', message: 'Доступ к этим данным закрыт.' },
  404: { kind: 'notfound', message: 'Данные не найдены.' },
  409: { kind: 'conflict', message: 'Такая запись уже есть.' },
  422: { kind: 'validation', message: 'Сервер не принял данные. Проверьте заполненные поля.' },
  429: { kind: 'server', message: 'Слишком много запросов подряд. Подождите минуту и повторите.' },
  500: { kind: 'server', message: 'Сервер не смог обработать запрос. Мы уже видим эту ошибку.' },
  502: { kind: 'server', message: 'Сервер временно недоступен. Попробуйте через минуту.' },
  503: { kind: 'server', message: 'Сервер временно недоступен. Попробуйте через минуту.' },
}

/**
 * Приводит любую ошибку к ApiError и пишет её в журнал.
 * scope — место, где случилось: 'api.saveMeasurement' и т.п.
 */
export function toApiError(cause: unknown, scope: string): ApiError {
  if (cause instanceof ApiError) {
    log.error(scope, cause.message, cause.technical)
    return cause
  }

  const raw = read(cause)
  const technical = [raw.code, raw.status, raw.message, raw.details].filter(Boolean).join(' | ')

  let result: ApiError

  if (isNetworkFailure(raw, cause)) {
    result = new ApiError(
      'network',
      'Нет связи с сервером. Проверьте интернет и повторите попытку.',
      technical,
    )
  } else if (raw.code && BY_PG_CODE[raw.code]) {
    const known = BY_PG_CODE[raw.code]
    result = new ApiError(known.kind, known.message, technical)
  } else if (raw.status && BY_HTTP_STATUS[raw.status]) {
    const known = BY_HTTP_STATUS[raw.status]
    result = new ApiError(known.kind, known.message, technical)
  } else if (raw.status && raw.status >= 500) {
    result = new ApiError(
      'server',
      'Сервер не смог обработать запрос. Попробуйте позже.',
      technical,
    )
  } else {
    result = new ApiError(
      'server',
      'Что-то пошло не так. Повторите попытку — если не поможет, напишите в поддержку.',
      technical || String(cause),
    )
  }

  log.error(scope, `${result.kind}: ${result.message}`, technical)
  return result
}
