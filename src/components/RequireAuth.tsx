import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { LoadingState } from '@/components/states'
import { useAuth } from '@/lib/auth-context'

/**
 * Защита внутренних разделов: без входа — на экран входа,
 * с истёкшей подпиской — на экран продления.
 *
 * Пока сессия восстанавливается, ничего не решаем: иначе при каждом
 * обновлении страницы участницу успевало бы выбросить на вход.
 */
export default function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <LoadingState label="Проверяем доступ…" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (user.subscription === 'expired') {
    return <Navigate to="/subscription" replace />
  }

  return <Outlet />
}
