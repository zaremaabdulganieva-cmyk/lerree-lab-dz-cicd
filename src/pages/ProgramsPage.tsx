import { Link } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import { Badge, Card } from '@/components/ui'
import { fetchProgram } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { useAsync } from '@/hooks/useAsync'

/** Раздел «Программы»: текущая программа участницы и список её тренировок. */
export default function ProgramsPage() {
  const { user } = useAuth()
  const { status, data: program, error, retry } = useAsync(fetchProgram)

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
          Привет, {user?.name}
        </h1>
        <p className="mt-1 text-sm text-muted">Ваш план тренировок на эту неделю</p>
      </div>

      {status === 'loading' && <LoadingState label="Загружаем программу…" />}
      {status === 'error' && <ErrorState message={error ?? ''} onRetry={retry} />}

      {status === 'success' && !program && (
        <EmptyState
          title="Программа пока не назначена"
          description="Тренер ещё не открыл программу для вашего аккаунта. Как только она появится, вы увидите её здесь."
        />
      )}

      {status === 'success' && program && program.workouts.length === 0 && (
        <EmptyState
          title="Программа скоро появится"
          description="Тренер ещё не назначил программу. Как только она появится, вы увидите её здесь."
        />
      )}

      {status === 'success' && program && program.workouts.length > 0 && (
        <>
          <Card>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-ink">{program.title}</h2>
              <Badge>
                Неделя {program.currentWeek} из {program.weeks}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-muted">{program.description}</p>
            <div
              className="mt-4 h-2 w-full overflow-hidden rounded-full bg-accent-soft"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={program.weeks}
              aria-valuenow={program.currentWeek}
              aria-label="Прогресс по программе"
            >
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${(program.currentWeek / program.weeks) * 100}%` }}
              />
            </div>
          </Card>

          <ul className="grid gap-3 sm:grid-cols-2">
            {program.workouts.map((workout) => (
              <li key={workout.id}>
                <Link
                  to={`/workouts/${workout.id}`}
                  className="block h-full rounded-2xl border border-line bg-card p-4 shadow-card transition hover:border-accent sm:p-5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted">
                      {workout.day}
                    </span>
                    <Badge>{workout.durationMin} мин</Badge>
                  </div>
                  <h3 className="mt-2 text-base font-semibold text-ink">{workout.title}</h3>
                  <p className="mt-1 text-sm text-muted">{workout.focus}</p>
                  <p className="mt-3 text-sm font-medium text-accent">
                    {workout.exercises.length} упражнений →
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
