import { createContext, useContext } from 'react'
import type { User } from '@/lib/types'

export interface AuthContextValue {
  /** Вошедшая участница или null. */
  user: User | null
  /** true, пока проверяем сохранённую сессию — в это время экран ещё не решён. */
  loading: boolean
  /** Ошибка восстановления сессии (нет связи, приложение собрано без настроек). */
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

/** Даёт доступ к текущей участнице и методам входа/выхода. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth нужно вызывать внутри <AuthProvider>')
  return context
}
