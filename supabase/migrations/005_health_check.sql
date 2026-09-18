-- =====================================================================
-- Миграция 005 — функция для проверки здоровья (health check)
--
-- Мониторинг раз в несколько минут спрашивает приложение «ты жив?».
-- Честный ответ требует дойти до самой базы, а не только до сервера
-- с сайтом. Эта функция — самый дешёвый способ: один короткий запрос,
-- который ничего не читает из таблиц и ничего не раскрывает.
--
-- Выполнять после 004.
-- =====================================================================

create or replace function public.health_check()
returns json
language sql
stable
security invoker
set search_path = public
as $$
  select json_build_object('db', 'ok', 'time', now());
$$;

comment on function public.health_check() is 'Проверка доступности базы для /api/health';

-- Доступна и гостю: проверка идёт без входа. Кроме текущего времени
-- функция ничего не отдаёт.
revoke all on function public.health_check() from public;
grant execute on function public.health_check() to anon, authenticated;
