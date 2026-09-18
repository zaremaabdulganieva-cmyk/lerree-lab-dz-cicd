import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth-context'
import { Button, Card } from '@/components/ui'
import { formatDate } from '@/lib/format'

/** Экран «подписка истекла»: доступ к контенту закрыт, но путь к продлению очевиден. */
export default function SubscriptionExpiredPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-4 py-10">
      <Card className="w-full max-w-md text-center">
        <h1 className="text-xl font-bold text-ink">Подписка закончилась</h1>
        <p className="mt-2 text-sm text-muted">
          {user
            ? `${user.name}, доступ был открыт до ${formatDate(user.subscriptionUntil)}.`
            : null}{' '}
          Продлите подписку, чтобы вернуться к программам, материалам и замерам — весь прогресс
          сохранён.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={() => window.alert('В демо-версии оплата не подключена.')}>
            Продлить подписку
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              void signOut().then(() => navigate('/login', { replace: true }))
            }}
          >
            Войти под другим аккаунтом
          </Button>
        </div>
      </Card>
    </div>
  )
}
