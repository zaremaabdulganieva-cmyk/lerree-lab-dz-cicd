-- =====================================================================
-- Миграция 004 — настройка демо-участниц
--
-- ПЕРЕД запуском создать двух пользователей в панели Supabase:
--   Authentication → Users → Add user → Create new user
--     anna@demo.ru  / demo1234   (галочка «Auto Confirm User»)
--     olga@demo.ru  / demo1234   (галочка «Auto Confirm User»)
--
-- Карточки профилей создаются триггером из миграции 001 автоматически.
-- Здесь мы только дописываем имя, статус подписки и историю:
--   Анна — подписка активна, есть замеры и прошлая тренировка;
--   Ольга — подписка истекла (проверка экрана «доступ закрыт»).
--
-- Миграцию можно запускать повторно.
-- =====================================================================

do $$
declare
  anna_id uuid;
  olga_id uuid;
begin
  select id into anna_id from auth.users where email = 'anna@demo.ru';
  select id into olga_id from auth.users where email = 'olga@demo.ru';

  if anna_id is null or olga_id is null then
    raise exception 'Сначала создайте пользователей anna@demo.ru и olga@demo.ru в Authentication → Users';
  end if;

  -- Профили. Пишем напрямую (мы в SQL Editor, то есть от имени владельца
  -- базы) — политики доступа на этот запуск не распространяются.
  insert into public.profiles (user_id, name, role, subscription_status, subscription_until)
  values (anna_id, 'Анна', 'member', 'active', current_date + 120)
  on conflict (user_id) do update
    set name = excluded.name,
        subscription_status = excluded.subscription_status,
        subscription_until  = excluded.subscription_until;

  insert into public.profiles (user_id, name, role, subscription_status, subscription_until)
  values (olga_id, 'Ольга', 'member', 'expired', current_date - 30)
  on conflict (user_id) do update
    set name = excluded.name,
        subscription_status = excluded.subscription_status,
        subscription_until  = excluded.subscription_until;

  -- История замеров Анны: три точки за последние три месяца.
  insert into public.measurements (user_id, measured_on, weight_kg, waist_cm, hips_cm) values
    (anna_id, current_date - 90, 62.4, 72.0, 98.0),
    (anna_id, current_date - 60, 61.5, 70.5, 97.0),
    (anna_id, current_date - 30, 60.8, 69.0, 96.0)
  on conflict (user_id, measured_on) do nothing;

  -- Прошлая тренировка Анны — из неё приложение показывает подсказку
  -- «в прошлый раз» на карточке упражнения.
  insert into public.workout_sets (user_id, exercise_id, performed_on, set_index, kg, reps) values
    (anna_id, '33333333-0000-0000-0000-000000000001', current_date - 7, 1, 12, 12),
    (anna_id, '33333333-0000-0000-0000-000000000001', current_date - 7, 2, 12, 12),
    (anna_id, '33333333-0000-0000-0000-000000000001', current_date - 7, 3, 14, 10),
    (anna_id, '33333333-0000-0000-0000-000000000001', current_date - 7, 4, 14, 10),
    (anna_id, '33333333-0000-0000-0000-000000000002', current_date - 7, 1, 20, 15),
    (anna_id, '33333333-0000-0000-0000-000000000002', current_date - 7, 2, 20, 15),
    (anna_id, '33333333-0000-0000-0000-000000000002', current_date - 7, 3, 22, 12),
    (anna_id, '33333333-0000-0000-0000-000000000004', current_date - 7, 1,  8, 12),
    (anna_id, '33333333-0000-0000-0000-000000000004', current_date - 7, 2,  8, 12),
    (anna_id, '33333333-0000-0000-0000-000000000004', current_date - 7, 3, 10, 10),
    (anna_id, '33333333-0000-0000-0000-000000000004', current_date - 7, 4, 10, 10),
    (anna_id, '33333333-0000-0000-0000-000000000005', current_date - 7, 1,  6, 12),
    (anna_id, '33333333-0000-0000-0000-000000000005', current_date - 7, 2,  6, 12),
    (anna_id, '33333333-0000-0000-0000-000000000005', current_date - 7, 3,  6, 10),
    (anna_id, '33333333-0000-0000-0000-000000000006', current_date - 7, 1, 16, 10),
    (anna_id, '33333333-0000-0000-0000-000000000006', current_date - 7, 2, 16, 10),
    (anna_id, '33333333-0000-0000-0000-000000000006', current_date - 7, 3, 18,  8),
    (anna_id, '33333333-0000-0000-0000-000000000006', current_date - 7, 4, 18,  8)
  on conflict (user_id, exercise_id, performed_on, set_index) do nothing;

  raise notice 'Демо-участницы настроены: Анна (активна), Ольга (подписка истекла)';
end $$;
