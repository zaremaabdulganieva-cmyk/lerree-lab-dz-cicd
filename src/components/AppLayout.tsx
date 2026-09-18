import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { isOffline, setOffline } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui'

const NAV_ITEMS = [
  { to: '/programs', label: 'Программы', icon: '▤' },
  { to: '/materials', label: 'Материалы', icon: '◈' },
  { to: '/measurements', label: 'Замеры', icon: '◔' },
]

/**
 * Каркас кабинета: шапка с профилем, навигация (сверху на десктопе,
 * нижняя панель на телефоне) и область страницы.
 */
export default function AppLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [offline, setOfflineState] = useState(isOffline())

  function toggleOffline() {
    const next = !offline
    setOffline(next)
    setOfflineState(next)
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-10 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <span className="text-base font-bold tracking-tight text-ink">Lerree Lab</span>

          <nav className="ml-4 hidden gap-1 sm:flex" aria-label="Разделы кабинета">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-xl px-3 py-2 text-sm font-medium transition ${
                    isActive ? 'bg-accent-soft text-accent' : 'text-muted hover:text-ink'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={toggleOffline}
              aria-pressed={offline}
              title="Демо-переключатель: имитирует обрыв связи"
              className={`hidden min-h-9 rounded-xl border px-3 text-xs font-medium sm:inline-flex sm:items-center ${
                offline ? 'border-warm bg-warm-soft text-ink' : 'border-line bg-card text-muted'
              }`}
            >
              {offline ? 'Сеть: выключена' : 'Сеть: включена'}
            </button>
            <span className="hidden text-sm text-muted sm:inline">{user?.name}</span>
            <Button
              variant="ghost"
              onClick={() => void handleSignOut()}
              className="min-h-9 px-3 text-xs"
            >
              Выйти
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-24 pt-5 sm:pb-10">
        <Outlet />
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-card sm:hidden"
        aria-label="Разделы кабинета"
      >
        <div className="flex">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${
                  isActive ? 'text-accent' : 'text-muted'
                }`
              }
            >
              <span aria-hidden="true" className="text-base leading-none">
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
