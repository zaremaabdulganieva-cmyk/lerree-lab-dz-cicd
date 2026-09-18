import { Link, useParams } from 'react-router-dom'
import ExerciseCard from '@/components/ExerciseCard'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import { Badge } from '@/components/ui'
import { fetchProgram, fetchSavedSets } from '@/lib/api'
import { useAsync } from '@/hooks/useAsync'

/** Экран тренировки: список упражнений с вводом рабочего веса по подходам. */
export default function WorkoutPage() {
  const { workoutId } = useParams<{ workoutId: string }>()

  const { status, data, error, retry } = useAsync(async () => {
    const [program, savedSets] = await Promise.all([fetchProgram(), fetchSavedSets()])
    return { program, savedSets }
  }, [workoutId])

  const workout = data?.program?.workouts.find((item) => item.id === workoutId)

  return (
    <section className="flex flex-col gap-4">
      <Link to="/programs" className="text-sm font-medium text-accent">
        ← К программам
      </Link>

      {status === 'loading' && <LoadingState label="Загружаем тренировку…" />}
      {status === 'error' && <ErrorState message={error ?? ''} onRetry={retry} />}

      {status === 'success' && !workout && (
        <EmptyState
          title="Тренировка не найдена"
          description="Возможно, программа изменилась. Вернитесь к списку и выберите тренировку заново."
        />
      )}

      {status === 'success' && workout && (
        <>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
                {workout.title}
              </h1>
              <Badge>{workout.day}</Badge>
              <Badge>{workout.durationMin} мин</Badge>
            </div>
            <p className="mt-1 text-sm text-muted">
              Запишите вес и повторы после каждого подхода — данные сохраняются на устройстве, даже
              если пропадёт связь.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {workout.exercises.map((exercise) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                savedSets={data?.savedSets[exercise.id]}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
