import { useCallback, useEffect, useState } from 'react'

export type AsyncStatus = 'loading' | 'error' | 'success'

export interface AsyncState<T> {
  status: AsyncStatus
  data: T | null
  error: string | null
  /** Повторяет запрос — используется кнопкой «Попробовать снова» на экране ошибки. */
  retry: () => void
}

/**
 * Загружает данные и отдаёт три состояния экрана: загрузка, ошибка, успех.
 * Ответ устаревшего запроса игнорируется, чтобы не перезаписать свежий.
 */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [status, setStatus] = useState<AsyncStatus>('loading')
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  const retry = useCallback(() => setAttempt((value) => value + 1), [])

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setError(null)

    loader()
      .then((result) => {
        if (cancelled) return
        setData(result)
        setStatus('success')
      })
      .catch((cause: unknown) => {
        if (cancelled) return
        setError(cause instanceof Error ? cause.message : 'Что-то пошло не так')
        setStatus('error')
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- перезапуск задаётся deps вызывающего кода
  }, [attempt, ...deps])

  return { status, data, error, retry }
}
