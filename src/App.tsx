import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from '@/components/AppLayout'
import RequireAuth from '@/components/RequireAuth'
import LoginPage from '@/pages/LoginPage'
import MaterialsPage from '@/pages/MaterialsPage'
import MeasurementsPage from '@/pages/MeasurementsPage'
import NotFoundPage from '@/pages/NotFoundPage'
import ProgramsPage from '@/pages/ProgramsPage'
import SubscriptionExpiredPage from '@/pages/SubscriptionExpiredPage'
import WorkoutPage from '@/pages/WorkoutPage'

/** Карта маршрутов кабинета: публичные экраны и защищённая зона под RequireAuth. */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/programs" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/subscription" element={<SubscriptionExpiredPage />} />

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
  )
}
