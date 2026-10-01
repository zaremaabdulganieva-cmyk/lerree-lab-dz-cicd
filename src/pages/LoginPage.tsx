import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '@/lib/demo-accounts'
import { reachGoal } from '@/lib/analytics'
import { log } from '@/lib/logger'
import { readOAuthError } from '@/lib/oauth'
import { useAuth } from '@/lib/auth-context'
import { Button, Card, Field } from '@/components/ui'
import { LoadingState } from '@/components/states'

/** Экран входа: демо-аккаунты подставляются в один клик. */
export default function LoginPage() {
  const { user, loading, error: authError, signIn, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('anna@demo.ru')
  const [password, setPassword] = useState(DEMO_PASSWORD)
  // Google вернул участницу с ошибкой (отмена, устаревшая ссылка) —
  // показываем её сразу, текст берём из адреса страницы.
  const [error, setError] = useState<string | null>(
    () => readOAuthError(window.location.search, window.location.hash)?.message ?? null,
  )
  const [pending, setPending] = useState(false)
  const [googlePending, setGooglePending] = useState(false)

  // Код ошибки из адреса пишем в журнал и убираем: после обновления
  // страницы старое сообщение не должно всплывать снова.
  useEffect(() => {
    const oauthError = readOAuthError(window.location.search, window.location.hash)
    if (!oauthError) return
    log.warn('auth.google', 'вход через Google не удался', oauthError.technical)
    reachGoal('login_google_error', { code: oauthError.technical.split(' | ')[0] })
    window.history.replaceState(null, '', window.location.pathname)
  }, [])

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
      reachGoal('login_error')
      setError(cause instanceof Error ? cause.message : 'Не удалось войти')
    } finally {
      setPending(false)
    }
  }

  async function handleGoogle() {
    setError(null)
    setGooglePending(true)
    try {
      await signInWithGoogle()
      // Дальше браузер уходит на страницу Google — кнопку не разблокируем.
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Не удалось перейти к Google')
      setGooglePending(false)
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

          <div className="my-4 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-line" />
            или
            <span className="h-px flex-1 bg-line" />
          </div>

          <Button
            variant="ghost"
            className="w-full"
            disabled={googlePending || pending}
            onClick={() => void handleGoogle()}
          >
            <GoogleIcon />
            {googlePending ? 'Переходим к Google…' : 'Войти через Google'}
          </Button>
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

        <p className="mt-4 text-center text-xs text-muted">
          <Link to="/privacy" className="underline">
            Политика конфиденциальности
          </Link>
        </p>
      </div>
    </div>
  )
}

/** Логотип Google — по правилам оформления кнопки «Войти через Google». */
function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="size-4">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  )
}
