import type { ReactNode } from 'react'
import { Button, Card } from '@/components/ui'

/** Скелет на время загрузки — вместо пустого экрана и «прыгающей» вёрстки. */
export function LoadingState({ label = 'Загружаем данные…' }: { label?: string }) {
  return (
    <Card>
      <p className="sr-only" role="status">
        {label}
      </p>
      <div className="animate-pulse space-y-3" data-testid="loading-state">
        <div className="h-4 w-1/3 rounded bg-line" />
        <div className="h-3 w-2/3 rounded bg-line" />
        <div className="h-3 w-1/2 rounded bg-line" />
      </div>
    </Card>
  )
}

/** Ошибка загрузки: объясняем, что случилось, и даём повторить. */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card className="border-warm bg-warm-soft">
      <p role="alert" className="text-sm text-ink">
        {message}
      </p>
      {onRetry && (
        <Button variant="ghost" className="mt-3" onClick={onRetry}>
          Попробовать снова
        </Button>
      )}
    </Card>
  )
}

/** Пустое состояние: не просто «ничего нет», а подсказка следующего шага. */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <Card className="text-center">
      <p className="text-base font-semibold text-ink">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted">{description}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </Card>
  )
}
