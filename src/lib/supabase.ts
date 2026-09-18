import { createClient, type SupabaseClient } from '@supabase/supabase-js'
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
 */

const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''

let client: SupabaseClient | null = null

/** Собрано ли приложение с настройками подключения. */
export function isConfigured(): boolean {
  return url.startsWith('http') && anonKey.length > 20
}

export function getSupabase(): SupabaseClient {
  if (!isConfigured()) {
    throw new ApiError(
      'config',
      'Приложение собрано без подключения к базе. Проверьте файл .env (VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY).',
      `url="${url}" key=${anonKey ? 'задан' : 'пуст'}`,
    )
  }

  if (!client) {
    client = createClient(url, anonKey, {
      auth: {
        // Сессия хранится в браузере и продлевается сама — вход
        // переживает перезагрузку страницы.
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: 'lerree-demo-auth',
      },
    })
    log.info('supabase', 'клиент создан', url)
  }

  return client
}
