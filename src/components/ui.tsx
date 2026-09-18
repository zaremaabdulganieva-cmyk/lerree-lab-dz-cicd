import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

/** Базовая карточка — основной строительный блок интерфейса. */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-line bg-card p-4 shadow-card sm:p-5 ${className}`}>
      {children}
    </div>
  )
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost'
}

/** Кнопка в двух вариантах: акцентная (CTA из концепции A) и второстепенная. */
export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  const base =
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50'
  const styles =
    variant === 'primary'
      ? 'bg-accent text-white hover:bg-accent/90'
      : 'border border-line bg-card text-ink hover:bg-accent-soft'

  return <button className={`${base} ${styles} ${className}`} {...props} />
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
  hint?: string
}

/** Поле ввода с подписью, подсказкой и текстом ошибки, связанными через aria. */
export function Field({ label, error, hint, id, className = '', ...props }: FieldProps) {
  const inputId = id ?? props.name ?? label
  const errorId = `${inputId}-error`
  const hintId = `${inputId}-hint`

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={`min-h-11 rounded-xl border bg-card px-3 text-base text-ink placeholder:text-muted ${
          error ? 'border-warm' : 'border-line'
        } ${className}`}
        {...props}
      />
      {hint && !error && (
        <span id={hintId} className="text-xs text-muted">
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} role="alert" className="text-xs text-warm">
          {error}
        </span>
      )}
    </div>
  )
}

/** Небольшой бейдж-метка: тип материала, фокус тренировки и т. п. */
export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
      {children}
    </span>
  )
}
