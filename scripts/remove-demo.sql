-- =====================================================================
-- Уборка: удаляет демо-кабинет из проекта Supabase целиком.
--
-- Демо живёт в общем проекте с другим приложением (fingram-studio).
-- Когда курс сдан, этот скрипт убирает всё, что создали миграции
-- 001–004, и не трогает ничего чужого: удаление идёт только по
-- списку наших объектов.
--
-- Куда выполнять: Supabase → SQL Editor → Run.
-- =====================================================================

begin;

-- Демо-участницы. Их замеры и подходы уйдут следом (on delete cascade).
delete from auth.users where email in ('anna@demo.ru', 'olga@demo.ru');

drop trigger if exists on_auth_user_created on auth.users;

drop view  if exists public.last_workout_sets;

drop table if exists public.workout_sets;
drop table if exists public.measurements;
drop table if exists public.exercises;
drop table if exists public.workouts;
drop table if exists public.programs;
drop table if exists public.materials;
drop table if exists public.profiles;

drop function if exists public.handle_new_user();
drop function if exists public.touch_updated_at();
drop function if exists public.guard_profile_fields();
drop function if exists public.is_active_member(uuid);
drop function if exists public.is_admin(uuid);
drop function if exists public.health_check();

drop type if exists material_kind;
drop type if exists subscription_status;
drop type if exists user_role;

commit;
