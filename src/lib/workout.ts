import { readStorage, writeStorage } from '@/lib/storage'
import type { SetEntry } from '@/lib/types'

/** Черновик подходов: значения полей ввода до нажатия «Сохранить». */
export type SetDraft = { kg: string; reps: string }

const DRAFT_KEY = 'set-drafts'

type DraftMap = Record<string, SetDraft[]>

/**
 * Черновик живёт в localStorage: если связь оборвалась или страница перезагрузилась,
 * участница не вводит подходы заново (требование ТЗ 3.3).
 */
export function readDraft(exerciseId: string): SetDraft[] | null {
  const all = readStorage<DraftMap>(DRAFT_KEY, {})
  return all[exerciseId] ?? null
}

export function writeDraft(exerciseId: string, draft: SetDraft[]): void {
  const all = readStorage<DraftMap>(DRAFT_KEY, {})
  writeStorage(DRAFT_KEY, { ...all, [exerciseId]: draft })
}

export function clearDraft(exerciseId: string): void {
  const all = readStorage<DraftMap>(DRAFT_KEY, {})
  delete all[exerciseId]
  writeStorage(DRAFT_KEY, all)
}

/** Начальные значения полей: сохранённый результат, затем черновик, иначе пустые поля. */
export function buildInitialDraft(
  exerciseId: string,
  plannedSets: number,
  saved: SetEntry[] | undefined,
): SetDraft[] {
  const draft = readDraft(exerciseId)
  if (draft && draft.length === plannedSets) return draft

  return Array.from({ length: plannedSets }, (_, index) => {
    const set = saved?.[index]
    return set ? { kg: String(set.kg), reps: String(set.reps) } : { kg: '', reps: '' }
  })
}

/** Превращает заполненные строки черновика в подходы; пустые строки пропускаются. */
export function draftToSets(draft: SetDraft[]): SetEntry[] {
  return draft
    .filter((row) => row.kg.trim() !== '' && row.reps.trim() !== '')
    .map((row) => ({
      kg: Number(row.kg.replace(',', '.')),
      reps: Number(row.reps),
    }))
}
