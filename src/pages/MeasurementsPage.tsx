import { useState, type FormEvent } from 'react'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import { Button, Card, Field } from '@/components/ui'
import { fetchMeasurements, saveMeasurement } from '@/lib/api'
import { formatDate, formatDelta, formatNumber } from '@/lib/format'
import type { Measurement, MeasurementDraft } from '@/lib/types'
import { validateMeasurement } from '@/lib/validation'
import { useAsync } from '@/hooks/useAsync'

const EMPTY_DRAFT: MeasurementDraft = { date: '', weightKg: '', waistCm: '', hipsCm: '' }

/** Раздел «Замеры»: личная история веса и объёмов с добавлением новой записи. */
export default function MeasurementsPage() {
  const { status, data, error, retry } = useAsync(fetchMeasurements)
  // Загруженная история хранится в useAsync; локальное состояние появляется
  // только после сохранения нового замера — чтобы не дублировать один список в двух местах.
  const [saved, setSaved] = useState<Measurement[] | null>(null)
  const [draft, setDraft] = useState<MeasurementDraft>(EMPTY_DRAFT)
  const [errors, setErrors] = useState<Partial<Record<keyof MeasurementDraft, string>>>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const history = saved ?? data ?? []

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaveError(null)

    const result = validateMeasurement(draft)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }

    setErrors({})
    setPending(true)
    try {
      const next = await saveMeasurement(result.value)
      setSaved(next)
      setDraft(EMPTY_DRAFT)
    } catch (cause: unknown) {
      setSaveError(
        cause instanceof Error ? cause.message : 'Не удалось сохранить замер, попробуйте снова',
      )
    } finally {
      setPending(false)
    }
  }

  function update(field: keyof MeasurementDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const reversed = [...history].reverse()

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Замеры</h1>
        <p className="mt-1 text-sm text-muted">
          Личная история веса и объёмов. Эти данные видите только вы.
        </p>
      </div>

      <Card>
        <h2 className="text-base font-semibold text-ink">Новый замер</h2>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4" noValidate>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Дата"
              name="date"
              type="date"
              value={draft.date}
              error={errors.date}
              onChange={(event) => update('date', event.target.value)}
            />
            <Field
              label="Вес, кг"
              name="weightKg"
              inputMode="decimal"
              placeholder="60,8"
              value={draft.weightKg}
              error={errors.weightKg}
              onChange={(event) => update('weightKg', event.target.value)}
            />
            <Field
              label="Талия, см"
              name="waistCm"
              inputMode="decimal"
              placeholder="69"
              value={draft.waistCm}
              error={errors.waistCm}
              onChange={(event) => update('waistCm', event.target.value)}
            />
            <Field
              label="Бёдра, см"
              name="hipsCm"
              inputMode="decimal"
              placeholder="96"
              value={draft.hipsCm}
              error={errors.hipsCm}
              onChange={(event) => update('hipsCm', event.target.value)}
            />
          </div>

          {saveError && (
            <p role="alert" className="rounded-xl bg-warm-soft px-3 py-2 text-sm text-ink">
              {saveError}
            </p>
          )}

          <Button type="submit" disabled={pending} className="sm:self-start">
            {pending ? 'Сохраняем…' : 'Сохранить замер'}
          </Button>
        </form>
      </Card>

      {status === 'loading' && <LoadingState label="Загружаем замеры…" />}
      {status === 'error' && <ErrorState message={error ?? ''} onRetry={retry} />}

      {status === 'success' && history.length === 0 && (
        <EmptyState
          title="Замеров пока нет"
          description="Добавьте первый замер — со второго начнём показывать динамику по весу и объёмам."
        />
      )}

      {status === 'success' && history.length > 0 && (
        <ul className="flex flex-col gap-3">
          {reversed.map((item, index) => {
            const previous = reversed[index + 1]
            return (
              <li key={item.id}>
                <Card>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-ink">{formatDate(item.date)}</span>
                    {previous && (
                      <span className="text-xs text-muted">
                        вес {formatDelta(item.weightKg, previous.weightKg, 'кг')} · талия{' '}
                        {formatDelta(item.waistCm, previous.waistCm, 'см')}
                      </span>
                    )}
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                    {[
                      ['Вес', `${formatNumber(item.weightKg)} кг`],
                      ['Талия', `${formatNumber(item.waistCm)} см`],
                      ['Бёдра', `${formatNumber(item.hipsCm)} см`],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl bg-accent-soft px-2 py-3">
                        <dt className="text-xs text-muted">{label}</dt>
                        <dd className="mt-0.5 text-sm font-semibold text-ink">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
