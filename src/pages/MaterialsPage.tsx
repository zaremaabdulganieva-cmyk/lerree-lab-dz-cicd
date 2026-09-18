import { useMemo, useState } from 'react'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import { Badge, Card } from '@/components/ui'
import { fetchMaterials } from '@/lib/api'
import { materialKindLabel } from '@/lib/format'
import { filterMaterials } from '@/lib/search'
import { useAsync } from '@/hooks/useAsync'

/** Раздел «Материалы»: статьи, рецепты, подкасты и эфиры с поиском по названию и тегам. */
export default function MaterialsPage() {
  const { status, data: materials, error, retry } = useAsync(fetchMaterials)
  const [query, setQuery] = useState('')

  const visible = useMemo(() => filterMaterials(materials ?? [], query), [materials, query])

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Материалы</h1>
        <p className="mt-1 text-sm text-muted">Статьи, рецепты, подкасты и записи эфиров</p>
      </div>

      <label className="flex flex-col gap-1">
        <span className="sr-only">Поиск по материалам</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Поиск: питание, техника, сон…"
          className="min-h-11 w-full rounded-xl border border-line bg-card px-4 text-base text-ink placeholder:text-muted"
        />
      </label>

      {status === 'loading' && <LoadingState label="Загружаем материалы…" />}
      {status === 'error' && <ErrorState message={error ?? ''} onRetry={retry} />}

      {status === 'success' && visible.length === 0 && (
        <EmptyState
          title="Ничего не найдено"
          description={`По запросу «${query}» материалов нет. Попробуйте другое слово — например, «питание» или «техника».`}
        />
      )}

      {status === 'success' && visible.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {visible.map((material) => (
            <li key={material.id}>
              <Card className="h-full">
                <div className="flex items-center justify-between gap-2">
                  <Badge>{materialKindLabel(material.kind)}</Badge>
                  <span className="text-xs text-muted">{material.minutes} мин</span>
                </div>
                <h2 className="mt-2 text-base font-semibold text-ink">{material.title}</h2>
                <p className="mt-1 text-sm text-muted">{material.excerpt}</p>
                <p className="mt-3 text-xs text-muted">
                  {material.tags.map((tag) => `#${tag}`).join(' ')}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
