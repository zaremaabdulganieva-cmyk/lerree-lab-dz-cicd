-- =====================================================================
-- Миграция 002 — политики доступа (Row Level Security)
--
-- Главная мысль: правила «кому что видно» живут в самой базе, а не в
-- коде приложения. Даже если кто-то возьмёт публичный ключ и начнёт
-- дёргать API напрямую, чужие замеры он не получит — база не отдаст.
--
-- Выполнять после 001.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Вспомогательная функция: «действующая участница».
-- Это админ или та, у кого подписка активна и не просрочена.
--
-- security definer — функция выполняется от имени владельца и потому
-- сама может читать profiles. Иначе получилось бы кольцо: чтобы
-- проверить доступ к profiles, нужно прочитать profiles.
-- ---------------------------------------------------------------------
create or replace function public.is_active_member(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = uid
      and (
        p.role = 'admin'
        or (p.subscription_status = 'active' and p.subscription_until >= current_date)
      )
  );
$$;

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles p where p.user_id = uid and p.role = 'admin');
$$;

-- ---------------------------------------------------------------------
-- Включаем защиту на всех таблицах.
-- Пока политики не заданы, включённый RLS означает «не видно ничего» —
-- это и есть безопасное состояние по умолчанию.
-- ---------------------------------------------------------------------
alter table public.profiles     enable row level security;
alter table public.programs     enable row level security;
alter table public.workouts     enable row level security;
alter table public.exercises    enable row level security;
alter table public.materials    enable row level security;
alter table public.measurements enable row level security;
alter table public.workout_sets enable row level security;

-- ---------------------------------------------------------------------
-- profiles: свою карточку видно и можно править; админ видит все.
-- ---------------------------------------------------------------------
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Участница может поменять имя, но не роль и не срок подписки:
-- иначе любая могла бы продлить себе доступ одним запросом.
create or replace function public.guard_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() пуст, когда запрос идёт не от участницы, а из панели
  -- Supabase или из служебной миграции — там правки разрешены.
  if auth.uid() is null or public.is_admin(auth.uid()) then
    return new;
  end if;

  if new.role is distinct from old.role
     or new.subscription_status is distinct from old.subscription_status
     or new.subscription_until  is distinct from old.subscription_until then
    raise exception 'Роль и подписку меняет только администратор'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard
  before update on public.profiles
  for each row execute function public.guard_profile_fields();

-- ---------------------------------------------------------------------
-- Контент клуба: читают только действующие участницы.
-- Истекла подписка — программы и материалы уже не отдаются.
-- Записывать контент через приложение нельзя ни в каком виде:
-- политик insert/update/delete здесь намеренно нет.
-- ---------------------------------------------------------------------
drop policy if exists "programs_select_members" on public.programs;
create policy "programs_select_members" on public.programs
  for select to authenticated
  using (is_published and public.is_active_member(auth.uid()));

drop policy if exists "workouts_select_members" on public.workouts;
create policy "workouts_select_members" on public.workouts
  for select to authenticated
  using (public.is_active_member(auth.uid()));

drop policy if exists "exercises_select_members" on public.exercises;
create policy "exercises_select_members" on public.exercises
  for select to authenticated
  using (public.is_active_member(auth.uid()));

drop policy if exists "materials_select_members" on public.materials;
create policy "materials_select_members" on public.materials
  for select to authenticated
  using (public.is_active_member(auth.uid()));

-- ---------------------------------------------------------------------
-- measurements — самые чувствительные данные: вес и объёмы.
-- Правило простое: видно и правится только своё.
-- ---------------------------------------------------------------------
drop policy if exists "measurements_select_own" on public.measurements;
create policy "measurements_select_own" on public.measurements
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "measurements_insert_own" on public.measurements;
create policy "measurements_insert_own" on public.measurements
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_active_member(auth.uid()));

drop policy if exists "measurements_update_own" on public.measurements;
create policy "measurements_update_own" on public.measurements
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "measurements_delete_own" on public.measurements;
create policy "measurements_delete_own" on public.measurements
  for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- workout_sets — записи тренировок, тоже строго свои.
-- ---------------------------------------------------------------------
drop policy if exists "workout_sets_select_own" on public.workout_sets;
create policy "workout_sets_select_own" on public.workout_sets
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "workout_sets_insert_own" on public.workout_sets;
create policy "workout_sets_insert_own" on public.workout_sets
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_active_member(auth.uid()));

drop policy if exists "workout_sets_update_own" on public.workout_sets;
create policy "workout_sets_update_own" on public.workout_sets
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "workout_sets_delete_own" on public.workout_sets;
create policy "workout_sets_delete_own" on public.workout_sets
  for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Права на уровне ролей Supabase.
-- anon — это неавторизованный посетитель: ему не открыто ничего.
-- authenticated — вошедшая участница; что именно ей видно, решают
-- политики выше.
-- ---------------------------------------------------------------------
-- Отзываем права только на свои таблицы: проект Supabase может быть
-- общим с другим приложением, и его таблицы эта миграция не трогает.
revoke all on public.profiles, public.programs, public.workouts, public.exercises,
              public.materials, public.measurements, public.workout_sets,
              public.last_workout_sets
  from anon;

grant select on public.programs, public.workouts, public.exercises, public.materials to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.measurements, public.workout_sets to authenticated;
grant select on public.last_workout_sets to authenticated;
