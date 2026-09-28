import { Link } from 'react-router-dom'
import { Card } from '@/components/ui'

/**
 * Политика конфиденциальности демо-кабинета.
 *
 * Google требует публичную ссылку на неё, чтобы вход через Google был
 * открыт всем, а не только тестировщикам. Текст честно описывает, что
 * демо получает от Google и где это хранится.
 */
export default function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-bg px-4 py-10">
      <Card className="mx-auto max-w-2xl">
        <h1 className="text-xl font-bold text-ink">Политика конфиденциальности</h1>
        <p className="mt-1 text-xs text-muted">Демо-версия кабинета Lerree Lab · сентябрь 2026</p>

        <div className="mt-5 flex flex-col gap-4 text-sm text-ink">
          <section>
            <h2 className="font-semibold">Что это за сайт</h2>
            <p className="mt-1 text-muted">
              Учебная демо-версия личного кабинета фитнес-клуба Lerree Lab. Контент в ней
              вымышленный, оплаты нет.
            </p>
          </section>

          <section>
            <h2 className="font-semibold">Какие данные мы получаем</h2>
            <p className="mt-1 text-muted">
              При входе через Google — только адрес электронной почты и имя из вашего
              Google-аккаунта. Доступа к почте, файлам, контактам и другим данным Google у нас нет.
              Внутри кабинета сохраняются записи, которые вы вводите сами: рабочие веса по подходам
              и замеры.
            </p>
          </section>

          <section>
            <h2 className="font-semibold">Где хранятся и кто видит</h2>
            <p className="mt-1 text-muted">
              Данные хранятся в базе Supabase. Свои записи видите только вы: это закреплено
              правилами доступа в самой базе. Данные не передаются третьим лицам и не используются
              для рекламы.
            </p>
          </section>

          <section>
            <h2 className="font-semibold">Как удалить данные</h2>
            <p className="mt-1 text-muted">
              Напишите на{' '}
              <a className="text-accent underline" href="mailto:zaremaabdulganieva@gmail.com">
                zaremaabdulganieva@gmail.com
              </a>{' '}
              — учётная запись и все записи будут удалены. После окончания учебного курса демо-база
              удаляется целиком.
            </p>
          </section>
        </div>

        <Link
          to="/login"
          className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-accent px-4 text-sm font-semibold text-white"
        >
          Ко входу
        </Link>
      </Card>
    </div>
  )
}
