import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from '@/components/AppLayout'
import RequireAuth from '@/components/RequireAuth'
import { LoadingState } from '@/components/states'
import LoginPage from '@/pages/LoginPage'

// Экран входа нужен сразу, остальные разделы грузятся, только когда
// участница в них переходит. Так первая загрузка не тянет код тренировок
// и замеров, которые до входа всё равно не нужны.
const MaterialsPage = lazy(() => import('@/pages/MaterialsPage'))
const MeasurementsPage = lazy(() => import('@/pages/MeasurementsPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage'))
const ProgramsPage = lazy(() => import('@/pages/ProgramsPage'))
const SubscriptionExpiredPage = lazy(() => import('@/pages/SubscriptionExpiredPage'))
const WorkoutPage = lazy(() => import('@/pages/WorkoutPage'))

/** Карта маршрутов кабинета: публичные экраны и защищённая зона под RequireAuth. */
export default function App() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-5xl px-4 py-10">
          <LoadingState label="Загружаем раздел…" />
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<Navigate to="/programs" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/subscription" element={<SubscriptionExpiredPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />

        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route path="/programs" element={<ProgramsPage />} />
            <Route path="/workouts/:workoutId" element={<WorkoutPage />} />
            <Route path="/materials" element={<MaterialsPage />} />
            <Route path="/measurements" element={<MeasurementsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
