-- =====================================================================
-- Миграция 001 — таблицы демо-кабинета Lerree Lab
--
-- Куда выполнять: Supabase → SQL Editor → New query → вставить → Run.
-- Порядок: 001 → 002 → 003 → 004.
--
-- Схема повторяет по смыслу боевую базу клуба, но данные здесь
-- вымышленные: платный контент в публичный репозиторий не попадает.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Справочные типы. Enum вместо свободного текста: база сама не даст
-- записать роль «member2» или статус «активна вроде бы».
-- ---------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('member', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_status as enum ('active', 'expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type material_kind as enum ('article', 'recipe', 'podcast', 'live');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- profiles — «карточка участницы».
-- Логин и пароль лежат в служебной таблице auth.users (её ведёт сам
-- Supabase). Здесь то, что знает про участницу приложение: имя, роль,
-- подписка. Связь один-к-одному по user_id.
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  user_id             uuid primary key references auth.users(id) on delete cascade,
  name                text not null default 'Участница',
  role                user_role not null default 'member',
  subscription_status subscription_status not null default 'active',
  subscription_until  date not null default (current_date + 30),
  created_at          timestamptz not null default now()
);

comment on table public.profiles is 'Карточка участницы: имя, роль, статус подписки';

-- ---------------------------------------------------------------------
-- Контент клуба: программа → тренировки → упражнения.
-- Связь «один ко многим» на каждом уровне; on delete cascade означает,
-- что при удалении программы её тренировки и упражнения уходят следом
-- и в базе не остаётся мусора.
-- ---------------------------------------------------------------------
create table if not exists public.programs (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text not null default '',
  weeks        int  not null check (weeks between 1 and 52),
  current_week int  not null default 1 check (current_week >= 1),
  is_published boolean not null default true,
  created_at   timestamptz not null default now(),
  constraint current_week_within_program check (current_week <= weeks)
);

create table if not exists public.workouts (
  id           uuid primary key default gen_random_uuid(),
  program_id   uuid not null references public.programs(id) on delete cascade,
  title        text not null,
  day_label    text not null,
  duration_min int  not null check (duration_min between 5 and 240),
  focus        text not null default '',
  position     int  not null default 0
);

create index if not exists workouts_program_idx on public.workouts(program_id, position);

create table if not exists public.exercises (
  id           uuid primary key default gen_random_uuid(),
  workout_id   uuid not null references public.workouts(id) on delete cascade,
  title        text not null,
  hint         text not null default '',
  planned_sets int  not null check (planned_sets between 1 and 10),
  reps_range   text not null default '',
  has_video    boolean not null default false,
  position     int  not null default 0
);

create index if not exists exercises_workout_idx on public.exercises(workout_id, position);

-- ---------------------------------------------------------------------
-- materials — статьи, рецепты, подкасты, эфиры.
-- tags — массив строк: в Postgres это нормальный тип, отдельная таблица
-- тегов для шести материалов была бы избыточной.
-- ---------------------------------------------------------------------
create table if not exists public.materials (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  kind       material_kind not null,
  excerpt    text not null default '',
  tags       text[] not null default '{}',
  minutes    int not null check (minutes between 1 and 600),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- measurements — личные замеры участницы.
-- Приватные данные: одна строка = один день. unique не даёт случайно
-- записать два замера на одну дату (кнопка нажата дважды).
-- ---------------------------------------------------------------------
create table if not exists public.measurements (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  measured_on date not null default current_date,
  weight_kg   numeric(5,2) not null check (weight_kg between 30 and 300),
  waist_cm    numeric(5,2) not null check (waist_cm  between 40 and 200),
  hips_cm     numeric(5,2) not null check (hips_cm   between 40 and 200),
  created_at  timestamptz not null default now(),
  unique (user_id, measured_on)
);

create index if not exists measurements_user_idx on public.measurements(user_id, measured_on desc);

-- ---------------------------------------------------------------------
-- workout_sets — рабочие веса по подходам.
-- Одна строка = один подход одного упражнения в конкретный день.
-- Такая «плоская» запись позволяет потом считать прогресс обычным SQL,
-- а не разбирать текст на клиенте.
-- ---------------------------------------------------------------------
create table if not exists public.workout_sets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  exercise_id  uuid not null references public.exercises(id) on delete cascade,
  performed_on date not null default current_date,
  set_index    int  not null check (set_index between 1 and 10),
  kg           numeric(5,1) not null check (kg between 0 and 500),
  reps         int  not null check (reps between 1 and 100),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, exercise_id, performed_on, set_index)
);

create index if not exists workout_sets_lookup_idx
  on public.workout_sets(user_id, exercise_id, performed_on desc);

-- ---------------------------------------------------------------------
-- «В прошлый раз» — не отдельное поле, а результат запроса.
-- Берём последний день ДО сегодняшнего, когда участница записывала
-- этот подход. Так подсказка всегда честная и не требует ручной правки.
-- ---------------------------------------------------------------------
create or replace view public.last_workout_sets
with (security_invoker = true) as
select s.user_id, s.exercise_id, s.performed_on, s.set_index, s.kg, s.reps
from public.workout_sets s
join lateral (
  select max(prev.performed_on) as last_day
  from public.workout_sets prev
  where prev.user_id = s.user_id
    and prev.exercise_id = s.exercise_id
    and prev.performed_on < current_date
) last_session on s.performed_on = last_session.last_day;

comment on view public.last_workout_sets is 'Подходы прошлой тренировки — подсказка «в прошлый раз»';

-- ---------------------------------------------------------------------
-- Новая участница зарегистрировалась → карточка профиля создаётся сама.
-- Без этого после регистрации приложение не знало бы имени и подписки.
-- security definer нужен, чтобы триггер мог писать в profiles
-- в обход политик доступа — он выполняется от имени владельца схемы.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'name', ''), split_part(new.email, '@', 1))
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Отметка времени правки подхода — пригодится при разборе спорных случаев.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists workout_sets_touch on public.workout_sets;
create trigger workout_sets_touch
  before update on public.workout_sets
  for each row execute function public.touch_updated_at();
