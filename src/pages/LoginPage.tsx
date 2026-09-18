import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '@/lib/demo-accounts'
import { useAuth } from '@/lib/auth-context'
import { Button, Card, Field } from '@/components/ui'
import { LoadingState } from '@/components/states'

/** Экран входа: демо-аккаунты подставляются в один клик. */
export default function LoginPage() {
  const { user, loading, error: authError, signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('anna@demo.ru')
  const [password, setPassword] = useState(DEMO_PASSWORD)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  // Пока проверяем сохранённую сессию, форму не показываем: иначе она
  // мелькнёт перед участницей, которая на самом деле уже вошла.
  if (loading) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16">
        <LoadingState label="Проверяем сессию…" />
      </div>
    )
  }

  if (user) {
    return <Navigate to={user.subscription === 'active' ? '/programs' : '/subscription'} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)
    try {
      await signIn(email, password)
      navigate('/programs', { replace: true })
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Не удалось войти')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-sm">
        <h1 className="text-center text-2xl font-bold tracking-tight text-ink">Lerree Lab</h1>
        <p className="mt-1 text-center text-sm text-muted">
          Личный кабинет участницы клуба — демо-версия
        </p>

        <Card className="mt-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <Field
              label="E-mail"
              name="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <Field
              label="Пароль"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />

            {authError && !error && (
              <p role="alert" className="rounded-xl bg-warm-soft px-3 py-2 text-sm text-ink">
                {authError}
              </p>
            )}

            {error && (
              <p role="alert" className="rounded-xl bg-warm-soft px-3 py-2 text-sm text-ink">
                {error}
              </p>
            )}

            <Button type="submit" disabled={pending}>
              {pending ? 'Входим…' : 'Войти'}
            </Button>
          </form>
        </Card>

        <Card className="mt-4">
          <p className="text-xs font-semibold text-ink">Демо-доступы</p>
          <p className="mt-1 text-xs text-muted">Пароль для обоих: {DEMO_PASSWORD}</p>
          <div className="mt-3 flex flex-col gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <Button
                key={account.email}
                variant="ghost"
                className="justify-between text-xs"
                onClick={() => {
                  setEmail(account.email)
                  setPassword(DEMO_PASSWORD)
                }}
              >
                <span>{account.email}</span>
                <span className="text-muted">{account.note}</span>
              </Button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
