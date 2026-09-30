import { AuthClient } from '@supabase/auth-js'
import { PostgrestClient } from '@supabase/postgrest-js'
import { ApiError } from '@/lib/errors'
import { log } from '@/lib/logger'

/**
 * Подключение к Supabase.
 *
 * Адрес и публичный ключ приходят из файла .env — в коде их нет.
 * Публичный ключ (anon) не секрет: он лежит в любом браузере, который
 * открыл приложение. Данные защищает не он, а политики доступа в самой
 * базе. Секретный ключ (service_role) в приложении не используется
 * вообще: с ним политики не действуют, и в браузере ему не место.
 *
 * Почему не createClient из @supabase/supabase-js: он тянет в браузер
 * ещё хранилище файлов, realtime, функции — около трети всего кода
 * кабинета, которым мы не пользуемся. Здесь собраны только две нужные
 * части: вход (auth-js) и запросы к таблицам (postgrest-js). Для
 * остального приложения интерфейс тот же: .auth и .from().
 */

const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''

export interface SupabaseLite {
  auth: InstanceType<typeof AuthClient>
  from: PostgrestClient['from']
}

let client: SupabaseLite | null = null

/** Собрано ли приложение с настройками подключения. */
export function isConfigured(): boolean {
  return url.startsWith('http') && anonKey.length > 20
}

export function getSupabase(): SupabaseLite {
  if (!isConfigured()) {
    throw new ApiError(
      'config',
      'Приложение собрано без подключения к базе. Проверьте файл .env (VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY).',
      `url="${url}" key=${anonKey ? 'задан' : 'пуст'}`,
    )
  }

  if (!client) {
    const auth = new AuthClient({
      url: `${url}/auth/v1`,
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      // Сессия хранится в браузере и продлевается сама — вход
      // переживает перезагрузку страницы.
      persistSession: true,
      autoRefreshToken: true,
      // Вход через Google возвращает участницу с одноразовым кодом в
      // адресе — клиент сам меняет его на сессию. PKCE: без секрета,
      // оставшегося в этом браузере, перехваченный код бесполезен.
      flowType: 'pkce',
      detectSessionInUrl: true,
      storageKey: 'lerree-demo-auth',
    })

    // Каждый запрос к таблицам идёт от имени вошедшей участницы: берём
    // её токен из сессии. Без входа — публичный ключ, и тогда политики
    // доступа в базе просто ничего не отдадут.
    const fetchWithAuth: typeof fetch = async (input, init) => {
      const { data } = await auth.getSession()
      const headers = new Headers(init?.headers)
      if (!headers.has('apikey')) headers.set('apikey', anonKey)
      if (!headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${data.session?.access_token ?? anonKey}`)
      }
      return fetch(input, { ...init, headers })
    }

    const rest = new PostgrestClient(`${url}/rest/v1`, { fetch: fetchWithAuth })

    client = { auth, from: rest.from.bind(rest) }
    log.info('supabase', 'клиент создан', url)
  }

  return client
}
