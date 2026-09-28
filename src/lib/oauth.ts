/**
 * Вход через Google (OAuth 2.0) — разбор того, с чем Google вернул
 * участницу обратно в кабинет.
 *
 * Как устроен вход целиком:
 *   1. Кнопка «Войти через Google» отправляет участницу на страницу
 *      Google через Supabase Auth.
 *   2. Google спрашивает согласие и возвращает её в Supabase, а тот —
 *      к нам на /login с одноразовым кодом (?code=…).
 *   3. supabase-js сам меняет код на сессию (схема PKCE: код бесполезен
 *      без секрета, который остался в этом браузере).
 *
 * Если что-то пошло не так, вместо кода в адресе приходит ?error=…
 * Эти коды — для программистов, участнице нужен понятный текст.
 */

const MESSAGES: Record<string, string> = {
  // Нажала «Отмена» на экране согласия Google.
  access_denied: 'Вход через Google отменён. Можно попробовать снова или войти по паролю.',
  // Ссылка устарела или её открыли в другом браузере.
  invalid_request: 'Ссылка для входа устарела. Нажмите «Войти через Google» ещё раз.',
  // Google или Supabase не смогли выдать вход (например, провайдер выключен).
  server_error:
    'Google сейчас не пускает в кабинет. Попробуйте через минуту или войдите по паролю.',
}

const FALLBACK = 'Не удалось войти через Google. Попробуйте ещё раз или войдите по паролю.'

export interface OAuthError {
  /** Что показать участнице. */
  message: string
  /** Код и описание от сервера — для журнала. */
  technical: string
}

/**
 * Достаёт ошибку входа из адреса страницы. Supabase кладёт её либо
 * в ?query, либо в #hash — смотрим оба. Нет ошибки — null.
 */
export function readOAuthError(search: string, hash = ''): OAuthError | null {
  for (const part of [search, hash.replace(/^#/, '?')]) {
    const params = new URLSearchParams(part)
    const code = params.get('error')
    if (!code) continue

    const errorCode = params.get('error_code') ?? ''
    const description = params.get('error_description') ?? ''
    const known =
      MESSAGES[code] ?? (errorCode === 'bad_oauth_state' ? MESSAGES.invalid_request : undefined)

    return {
      message: known ?? FALLBACK,
      technical: [code, errorCode, description].filter(Boolean).join(' | '),
    }
  }
  return null
}

/** Адрес, куда Google вернёт участницу после входа. */
export function oauthRedirectUrl(origin: string): string {
  return `${origin}/login`
}
