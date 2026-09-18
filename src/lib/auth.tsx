import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { fetchProfile, login as apiLogin, logout as apiLogout } from '@/lib/api'
import { AuthContext, type AuthContextValue } from '@/lib/auth-context'
import { toApiError } from '@/lib/errors'
import { log } from '@/lib/logger'
import { getSupabase, isConfigured } from '@/lib/supabase'
import type { User } from '@/lib/types'

/**
 * Вход через Supabase Auth.
 *
 * Сессию хранит сам Supabase: после перезагрузки страницы она
 * восстанавливается, а просроченный токен обновляется автоматически.
 * Пока идёт восстановление, приложение показывает загрузку — иначе
 * при обновлении страницы участницу выбрасывало бы на экран входа.
 *
 * Имя и статус подписки берём из таблицы profiles: в самом токене их
 * нет, да и не должно быть — подписку нельзя доверять клиенту.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  // Если приложение собрано без адреса базы, восстанавливать нечего —
  // это видно сразу, до первого запроса.
  const configured = isConfigured()

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(configured)
  const [error, setError] = useState<string | null>(
    configured
      ? null
      : 'Приложение собрано без подключения к базе. Задайте VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY.',
  )

  useEffect(() => {
    if (!configured) {
      log.error('auth', 'нет настроек подключения')
      return
    }

    let active = true
    const supabase = getSupabase()

    async function restore() {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError

        const session = data.session
        if (!session) {
          if (active) setLoading(false)
          return
        }

        const profile = await fetchProfile(session.user.id)
        if (!active) return
        setUser({ ...profile, email: session.user.email ?? '' })
        log.info('auth', 'сессия восстановлена', session.user.id)
      } catch (cause: unknown) {
        if (!active) return
        setError(toApiError(cause, 'auth.restore').message)
      } finally {
        if (active) setLoading(false)
      }
    }

    void restore()

    // Выход в соседней вкладке или окончательно протухший токен —
    // приложение должно узнать об этом само, без перезагрузки.
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return
      // INITIAL_SESSION без сессии — это просто «ещё не входили», а не выход.
      if (event === 'INITIAL_SESSION') return
      if (event === 'SIGNED_OUT' || !session) {
        setUser(null)
        log.info('auth', `событие ${event}: сессии больше нет`)
      }
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [configured])

  const signIn = useCallback(async (email: string, password: string) => {
    const nextUser = await apiLogin(email, password)
    setUser(nextUser)
    setError(null)
  }, [])

  const signOut = useCallback(async () => {
    try {
      await apiLogout()
    } finally {
      // Даже если сервер не ответил, из интерфейса выходим:
      // остаться «наполовину вошедшей» хуже, чем выйти локально.
      setUser(null)
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, error, signIn, signOut }),
    [user, loading, error, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
