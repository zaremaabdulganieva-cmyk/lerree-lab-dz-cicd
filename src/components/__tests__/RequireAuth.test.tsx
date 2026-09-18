import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import RequireAuth from '@/components/RequireAuth'
import { AuthContext, type AuthContextValue } from '@/lib/auth-context'
import type { User } from '@/lib/types'

/**
 * Проверяем саму защиту разделов, поэтому вход подставляем вручную —
 * настоящий Supabase Auth здесь не нужен.
 */
const ANNA: User = {
  id: 'user-anna',
  name: 'Анна',
  email: 'anna@demo.ru',
  role: 'member',
  subscription: 'active',
  subscriptionUntil: '2026-12-31',
}

const OLGA: User = { ...ANNA, id: 'user-olga', name: 'Ольга', subscription: 'expired' }

function renderAt(path: string, auth: Partial<AuthContextValue>) {
  const value: AuthContextValue = {
    user: null,
    loading: false,
    error: null,
    signIn: vi.fn(),
    signOut: vi.fn(),
    ...auth,
  }

  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthContext.Provider value={value}>
        <Routes>
          <Route path="/login" element={<p>Экран входа</p>} />
          <Route path="/subscription" element={<p>Подписка закончилась</p>} />
          <Route element={<RequireAuth />}>
            <Route path="/programs" element={<p>Программы участницы</p>} />
          </Route>
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

describe('RequireAuth — защита внутренних разделов', () => {
  it('уводит неавторизованного пользователя на экран входа', () => {
    renderAt('/programs', { user: null })
    expect(screen.getByText('Экран входа')).toBeInTheDocument()
  })

  it('пускает участницу с активной подпиской', () => {
    renderAt('/programs', { user: ANNA })
    expect(screen.getByText('Программы участницы')).toBeInTheDocument()
  })

  it('уводит участницу с истёкшей подпиской на экран продления', () => {
    renderAt('/programs', { user: OLGA })
    expect(screen.getByText('Подписка закончилась')).toBeInTheDocument()
  })

  it('пока сессия восстанавливается, никуда не уводит', () => {
    // Без этого при обновлении страницы вошедшую участницу успевало бы
    // выбросить на экран входа.
    renderAt('/programs', { user: null, loading: true })
    expect(screen.getByTestId('loading-state')).toBeInTheDocument()
    expect(screen.queryByText('Экран входа')).not.toBeInTheDocument()
  })
})
