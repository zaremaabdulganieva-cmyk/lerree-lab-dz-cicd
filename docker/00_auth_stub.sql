-- =====================================================================
-- Заглушка служебной части Supabase для локальной песочницы.
--
-- В облаке Supabase схему auth (пользователи, пароли, функция auth.uid())
-- ведёт сам сервис. В обычном Postgres её нет — поэтому здесь мы
-- создаём минимальный аналог. Это нужно ровно для одного: проверить,
-- что миграции и политики доступа применяются без ошибок, до того как
-- трогать облако.
--
-- В облаке этот файл НЕ выполняется.
-- =====================================================================

create extension if not exists pgcrypto;

-- Роли, на которые ссылаются политики доступа.
do $$ begin create role anon nologin;          exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin;  exception when duplicate_object then null; end $$;

create schema if not exists auth;

create table if not exists auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text unique not null,
  encrypted_password text,
  raw_user_meta_data jsonb not null default '{}',
  created_at         timestamptz not null default now()
);

-- Кто сейчас в запросе. В облаке личность берётся из подписанного токена;
-- локально её подставляют вручную:
--   set request.jwt.claims = '{"sub":"<id участницы>"}';
create or replace function auth.uid()
returns uuid
language sql stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::json->>'sub', '')::uuid;
$$;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth   to anon, authenticated, service_role;
