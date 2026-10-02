import { useRef, useState, type FormEvent } from 'react'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import { Button, Card, Field } from '@/components/ui'
import { deleteMeasurement, fetchMeasurements, saveMeasurement, updateMeasurement } from '@/lib/api'
import { formatDate, formatDelta, formatNumber } from '@/lib/format'
import type { Measurement, MeasurementDraft } from '@/lib/types'
import { validateMeasurement } from '@/lib/validation'
import { useAsync } from '@/hooks/useAsync'

const EMPTY_DRAFT: MeasurementDraft = { date: '', weightKg: '', waistCm: '', hipsCm: '' }

/** Число из базы обратно в поле ввода — с запятой, как участница его набирала. */
const toField = (value: number) => String(value).replace('.', ',')

function toDraft(item: Measurement): MeasurementDraft {
  return {
    date: item.date,
    weightKg: toField(item.weightKg),
    waistCm: toField(item.waistCm),
    hipsCm: toField(item.hipsCm),
  }
}

function messageOf(cause: unknown, fallback: string): string {
  return cause instanceof Error ? cause.message : fallback
}

/**
 * Раздел «Замеры»: личная история веса и объёмов.
 * Полный цикл: добавить, посмотреть, исправить, удалить.
 */
export default function MeasurementsPage() {
  const { status, data, error, retry } = useAsync(fetchMeasurements)
  // Загруженная история хранится в useAsync; локальное состояние появляется
  // только после сохранения нового замера — чтобы не дублировать один список в двух местах.
  const [saved, setSaved] = useState<Measurement[] | null>(null)
  const [draft, setDraft] = useState<MeasurementDraft>(EMPTY_DRAFT)
  const [errors, setErrors] = useState<Partial<Record<keyof MeasurementDraft, string>>>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  // Какой замер сейчас исправляем (форма та же, что для нового) и какой ждёт подтверждения удаления.
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [listError, setListError] = useState<string | null>(null)
  const formTitleRef = useRef<HTMLHeadingElement>(null)

  const history = saved ?? data ?? []
  const editing = editingId !== null

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
      const next = editingId
        ? await updateMeasurement(editingId, result.value)
        : await saveMeasurement(result.value)
      setSaved(next)
      setDraft(EMPTY_DRAFT)
      setEditingId(null)
    } catch (cause: unknown) {
      setSaveError(messageOf(cause, 'Не удалось сохранить замер, попробуйте снова'))
    } finally {
      setPending(false)
    }
  }

  function startEdit(item: Measurement) {
    setEditingId(item.id)
    setConfirmId(null)
    setDraft(toDraft(item))
    setErrors({})
    setSaveError(null)
    // На телефоне форма выше списка — подводим к ней, чтобы было видно, что открылось.
    formTitleRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  }

  function cancelEdit() {
    setEditingId(null)
    setDraft(EMPTY_DRAFT)
    setErrors({})
    setSaveError(null)
  }

  async function handleDelete(id: string) {
    setListError(null)
    setDeletingId(id)
    try {
      const next = await deleteMeasurement(id)
      setSaved(next)
      setConfirmId(null)
      if (editingId === id) cancelEdit()
    } catch (cause: unknown) {
      setListError(messageOf(cause, 'Не удалось удалить замер, попробуйте снова'))
    } finally {
      setDeletingId(null)
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
          Личная история веса и объёмов. Эти данные видите только вы — их можно исправить или
          удалить.
        </p>
      </div>

      <Card>
        <h2 ref={formTitleRef} className="scroll-mt-24 text-base font-semibold text-ink">
          {editing ? 'Исправить замер' : 'Новый замер'}
        </h2>
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

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" disabled={pending}>
              {pending ? 'Сохраняем…' : editing ? 'Сохранить изменения' : 'Сохранить замер'}
            </Button>
            {editing && (
              <Button type="button" variant="ghost" onClick={cancelEdit} disabled={pending}>
                Отменить
              </Button>
            )}
          </div>
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

      {listError && (
        <p role="alert" className="rounded-xl bg-warm-soft px-3 py-2 text-sm text-ink">
          {listError}
        </p>
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

                  {confirmId === item.id ? (
                    <div className="mt-3 flex flex-col gap-2 rounded-xl bg-warm-soft p-3 sm:flex-row sm:items-center">
                      <span className="text-sm text-ink sm:mr-auto">
                        Удалить замер за {formatDate(item.date)}? Вернуть его будет нельзя.
                      </span>
                      <Button
                        type="button"
                        onClick={() => void handleDelete(item.id)}
                        disabled={deletingId === item.id}
                      >
                        {deletingId === item.id ? 'Удаляем…' : 'Да, удалить'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setConfirmId(null)}
                        disabled={deletingId === item.id}
                      >
                        Оставить
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-3 flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        className="flex-1 sm:flex-none"
                        aria-label={`Изменить замер за ${formatDate(item.date)}`}
                        onClick={() => startEdit(item)}
                        disabled={editingId === item.id}
                      >
                        Изменить
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="flex-1 sm:flex-none"
                        aria-label={`Удалить замер за ${formatDate(item.date)}`}
                        onClick={() => {
                          setListError(null)
                          setConfirmId(item.id)
                        }}
                      >
                        Удалить
                      </Button>
                    </div>
                  )}
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
