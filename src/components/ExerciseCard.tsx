import { useState } from 'react'
import { Badge, Button, Card } from '@/components/ui'
import { saveSets } from '@/lib/api'
import { formatLastTime } from '@/lib/format'
import type { Exercise, SetEntry } from '@/lib/types'
import { isSetValid, validateKg, validateReps } from '@/lib/validation'
import {
  buildInitialDraft,
  clearDraft,
  draftToSets,
  writeDraft,
  type SetDraft,
} from '@/lib/workout'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface Props {
  exercise: Exercise
  savedSets?: SetEntry[]
}

/**
 * Карточка упражнения с вводом рабочего веса по подходам.
 * Черновик пишется в localStorage на каждое изменение — при обрыве связи
 * и перезагрузке страницы введённое не теряется.
 */
export default function ExerciseCard({ exercise, savedSets }: Props) {
  const [draft, setDraft] = useState<SetDraft[]>(() =>
    buildInitialDraft(exercise.id, exercise.plannedSets, savedSets),
  )
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [videoOpen, setVideoOpen] = useState(false)

  const lastTime = formatLastTime(exercise.lastTime)
  const filledRows = draft.filter((row) => row.kg.trim() !== '' || row.reps.trim() !== '')
  const canSave = filledRows.length > 0 && filledRows.every((row) => isSetValid(row.kg, row.reps))

  function updateRow(index: number, patch: Partial<SetDraft>) {
    setDraft((current) => {
      const next = current.map((row, i) => (i === index ? { ...row, ...patch } : row))
      writeDraft(exercise.id, next)
      return next
    })
    setStatus('idle')
  }

  async function handleSave() {
    setStatus('saving')
    setError(null)
    try {
      await saveSets(exercise.id, draftToSets(draft))
      clearDraft(exercise.id)
      setStatus('saved')
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? `${cause.message} Введённые подходы сохранены на устройстве — просто повторите сохранение.`
          : 'Не удалось сохранить',
      )
      setStatus('error')
    }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-ink">{exercise.title}</h3>
          <p className="mt-0.5 text-sm text-muted">{exercise.hint}</p>
        </div>
        <Badge>{exercise.repsRange}</Badge>
      </div>

      {lastTime && (
        <p className="mt-3 rounded-xl bg-accent-soft px-3 py-2 text-xs text-ink">
          В прошлый раз: {lastTime}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {draft.map((row, index) => {
          const kgError = row.kg.trim() === '' ? null : validateKg(row.kg)
          const repsError = row.reps.trim() === '' ? null : validateReps(row.reps)

          return (
            <div key={index} className="flex items-start gap-2">
              <span className="mt-3 w-14 shrink-0 text-xs font-medium text-muted">
                Подход {index + 1}
              </span>

              <div className="flex-1">
                <input
                  aria-label={`${exercise.title}: вес, подход ${index + 1}`}
                  inputMode="decimal"
                  placeholder="кг"
                  value={row.kg}
                  onChange={(event) => updateRow(index, { kg: event.target.value })}
                  aria-invalid={kgError && !kgError.ok ? true : undefined}
                  className={`min-h-11 w-full rounded-xl border bg-card px-3 text-base text-ink placeholder:text-muted ${
                    kgError && !kgError.ok ? 'border-warm' : 'border-line'
                  }`}
                />
                {kgError && !kgError.ok && (
                  <span role="alert" className="mt-1 block text-xs text-warm">
                    {kgError.error}
                  </span>
                )}
              </div>

              <div className="flex-1">
                <input
                  aria-label={`${exercise.title}: повторы, подход ${index + 1}`}
                  inputMode="numeric"
                  placeholder="повторы"
                  value={row.reps}
                  onChange={(event) => updateRow(index, { reps: event.target.value })}
                  aria-invalid={repsError && !repsError.ok ? true : undefined}
                  className={`min-h-11 w-full rounded-xl border bg-card px-3 text-base text-ink placeholder:text-muted ${
                    repsError && !repsError.ok ? 'border-warm' : 'border-line'
                  }`}
                />
                {repsError && !repsError.ok && (
                  <span role="alert" className="mt-1 block text-xs text-warm">
                    {repsError.error}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button onClick={handleSave} disabled={!canSave || status === 'saving'}>
          {status === 'saving' ? 'Сохраняем…' : 'Сохранить'}
        </Button>

        {exercise.hasVideo && (
          <Button variant="ghost" onClick={() => setVideoOpen((open) => !open)}>
            {videoOpen ? 'Скрыть видео' : 'Смотреть видео'}
          </Button>
        )}

        {status === 'saved' && (
          <span role="status" className="text-xs font-medium text-accent">
            Сохранено
          </span>
        )}
      </div>

      {status === 'error' && error && (
        <p role="alert" className="mt-3 rounded-xl bg-warm-soft px-3 py-2 text-xs text-ink">
          {error}
        </p>
      )}

      {videoOpen && (
        <div className="mt-4 flex aspect-video items-center justify-center rounded-xl border border-line bg-accent-soft text-center text-sm text-muted">
          {/* В боевом приложении здесь плеер Kinescope; в демо — постер-заглушка. */}
          Видео-разбор «{exercise.title}»
          <br />
          доступен участницам клуба
        </div>
      )}
    </Card>
  )
}
