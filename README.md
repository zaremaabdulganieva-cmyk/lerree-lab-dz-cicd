# Lerree Lab — кабинет участницы: CI/CD и интеграции

ДЗ 6 курса про ИИ-агентов: **«Настройка CI/CD и интеграция сервисов»**.

Личный кабинет участницы фитнес-клуба (React + Supabase) из [ДЗ 5](https://github.com/zaremaabdulganieva-cmyk/lerree-lab-dz-backend). Здесь он получил:

- автоматическую выкладку;
- аудит безопасности;
- вход через Google;
- Яндекс.Метрику;
- мониторинг;
- журнал в JSON.

Проект учебный, содержимое вымышленное. Боевой Lerree Lab с платным контентом клуба живёт в закрытом репозитории.

**Сайт:** <https://lerree-lab-dz-cicd.vercel.app> · **Проверка здоровья:** [/api/health](https://lerree-lab-dz-cicd.vercel.app/api/health)

Вход: `anna@demo.ru` (подписка активна) или `olga@demo.ru` (подписка истекла), пароль `demo1234`. Вход через Google работает в режиме Testing — только для тестировщиков из списка Google Console. Скриншот проверки — в [документации](integration_documentation.md#3-вход-через-google-oauth-20).

---

## Документы задания

- **[integration_documentation.md](integration_documentation.md)** — CI/CD, вход через Google, Метрика, мониторинг, логирование, оптимизация, как использовался ИИ, все переменные и секреты
- **[security_audit.md](security_audit.md)** — аудит по OWASP Top 10: 6 находок, исправления, рекомендации
- **[docs/log-analysis/](docs/log-analysis/README.md)** — анализ логов с ИИ: промпты, тестовый инцидент, разбор

## Что сделано — по шагам задания

| Шаг               | Итог                                                                                                                       |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 1. CI/CD          | GitHub Actions → Vercel. Проверки качества, превью на каждый PR, выкладка из `main`, проверка `/api/health` после выкладки |
| 2. Безопасность   | 2 высоких, 1 средняя, 3 низких находки — все исправлены; CSP и заголовки; Dependabot                                       |
| 3. OAuth2         | Google через Supabase Auth, PKCE; понятные ошибки; проверено живым аккаунтом                                                |
| 4. Аналитика      | Яндекс.Метрика 113255243: просмотры разделов кабинета и 8 целей, Вебвизор                                                   |
| 5. Платежи        | не делались (шаг необязательный)                                                                                           |
| 6. Мониторинг     | `/api/health` (вход + база, 200/503); проверка по расписанию с оповещением через issue                                      |
| 7. Логирование    | JSON, уровни info/warn/error; ошибки браузера собираются в журнал Vercel; анализ логов с ИИ                                  |
| 8. Оптимизация    | Lighthouse: Performance 78–86 → 99, Accessibility 91 → 100, SEO 91 → 100, первое содержимое 3,2–3,9 → 1,6 с               |
| 9. Документация   | этот README и документы выше                                                                                               |

## Стек

- **Интерфейс:** React 19, TypeScript, Tailwind 4, React Router, Vite
- **База и вход:** Supabase — PostgreSQL с политиками RLS, Auth (пароль + Google)
- **Хостинг:** Vercel, плюс две серверные функции: `/api/health`, `/api/log`
- **CI/CD:** GitHub Actions, Dependabot
- **Проверки:** Prettier, oxlint, TypeScript, Vitest (92 теста), `npm audit`
- **Аналитика:** Яндекс.Метрика

## Быстрый старт

```bash
npm install
cp .env.example .env    # адрес проекта Supabase и публичный ключ
npm run dev
```

Проверки, как в CI (форматирование, линтер, типы, тесты, уязвимости):

```bash
npm run check
```

Где взять адрес и ключ — [docs/setup-supabase.md](docs/setup-supabase.md). Как поднять выкладку в своём аккаунте Vercel — [integration_documentation.md, раздел 1](integration_documentation.md#как-повторить).

## Что внутри

```
.github/workflows/ci-cd.yml   проверки → превью / выкладка → проверка здоровья
.github/workflows/uptime.yml  мониторинг по расписанию с оповещением через issue
.github/dependabot.yml        обновления зависимостей группами
api/health.ts                 проверка здоровья: вход и база
api/log.ts                    приёмник ошибок из браузера → журнал Vercel
src/lib/supabase.ts           подключение: только auth-js и postgrest-js
src/lib/oauth.ts              разбор возврата от Google
src/lib/analytics.ts          Яндекс.Метрика: просмотры и цели
src/lib/logger.ts             журнал браузера в JSON
supabase/migrations/          схема, политики доступа, исправления аудита (006)
scripts/summarize-logs.mjs    сводка журнала перед разбором ИИ
scripts/check-rls.sql         12 проверок политик доступа на живой базе
vercel.json                   CSP и заголовки безопасности
```

## Как использовался ИИ

Всё сделано с **Claude Code**: автор ставит задачу и подтверждает каждый шаг, ИИ пишет код, конфигурации и документы и проверяет их на живом сайте и базе. Пуш и действия в личных кабинетах (Google, Supabase, Vercel, Метрика) делал автор. Подробная таблица «что делал ИИ, что проверялось руками» — в [integration_documentation.md, раздел 8](integration_documentation.md#8-как-использовался-ии).
