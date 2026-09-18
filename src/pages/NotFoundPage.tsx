import { Link } from 'react-router-dom'
import { Card } from '@/components/ui'

/** 404 без кодов ошибок: что случилось и куда идти дальше. */
export default function NotFoundPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-4">
      <Card className="max-w-md text-center">
        <h1 className="text-xl font-bold text-ink">Такой страницы нет</h1>
        <p className="mt-2 text-sm text-muted">
          Возможно, ссылка устарела или в адресе опечатка. Вернитесь к программам — оттуда открыты
          все разделы кабинета.
        </p>
        <Link
          to="/programs"
          className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-accent px-4 text-sm font-semibold text-white"
        >
          К программам
        </Link>
      </Card>
    </div>
  )
}
