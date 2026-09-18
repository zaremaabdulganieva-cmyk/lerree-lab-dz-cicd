-- =====================================================================
-- Проверка политик доступа (Row Level Security).
--
-- Скрипт заходит в базу «под видом» каждой участницы и сверяет, что
-- видно ровно то, что должно быть видно, а запрещённое — отклоняется.
--
-- Как запускать:
--   psql "<строка подключения к базе>" -f scripts/check-rls.sql
--
-- Вывод: таблица «проверка / ожидали / получили / итог» и общий вердикт.
-- =====================================================================

\set ON_ERROR_STOP on
\pset border 2

create temporary table checks (
  n serial primary key, name text, expected text, actual text
);

do $$
declare
  anna uuid;
  olga uuid;
  got  text;
begin
  select id into anna from auth.users where email = 'anna@demo.ru';
  select id into olga from auth.users where email = 'olga@demo.ru';

  if anna is null or olga is null then
    raise exception 'Нет демо-участниц. Сначала выполните миграцию 004.';
  end if;

  -- ===================================================================
  -- 1. Анна: подписка активна — контент и свои данные видны
  -- ===================================================================
  begin
    set local role authenticated;
    perform set_config('request.jwt.claims', json_build_object('sub', anna)::text, true);
    select count(*)::text into got from public.programs;
  exception when others then got := 'ошибка: ' || sqlerrm; end;
  reset role;
  insert into checks (name, expected, actual) values ('Анна видит программу', '1', got);

  begin
    set local role authenticated;
    perform set_config('request.jwt.claims', json_build_object('sub', anna)::text, true);
    select count(*)::text into got from public.materials;
  exception when others then got := 'ошибка: ' || sqlerrm; end;
  reset role;
  insert into checks (name, expected, actual) values ('Анна видит материалы', '6', got);

  begin
    set local role authenticated;
    perform set_config('request.jwt.claims', json_build_object('sub', anna)::text, true);
    select count(*)::text into got from public.measurements;
  exception when others then got := 'ошибка: ' || sqlerrm; end;
  reset role;
  insert into checks (name, expected, actual) values ('Анна видит свои замеры', '3', got);

  begin
    set local role authenticated;
    perform set_config('request.jwt.claims', json_build_object('sub', anna)::text, true);
    select count(*)::text into got from public.last_workout_sets;
  exception when others then got := 'ошибка: ' || sqlerrm; end;
  reset role;
  insert into checks (name, expected, actual)
  values ('Анна видит подсказку «в прошлый раз»', '18', got);

  -- ===================================================================
  -- 2. Ольга: подписка истекла — контент закрыт
  -- ===================================================================
  begin
    set local role authenticated;
    perform set_config('request.jwt.claims', json_build_object('sub', olga)::text, true);
    select count(*)::text into got from public.programs;
  exception when others then got := 'ошибка: ' || sqlerrm; end;
  reset role;
  insert into checks (name, expected, actual)
  values ('Ольге без подписки программы не видны', '0', got);

  begin
    set local role authenticated;
    perform set_config('request.jwt.claims', json_build_object('sub', olga)::text, true);
    select count(*)::text into got from public.materials;
  exception when others then got := 'ошибка: ' || sqlerrm; end;
  reset role;
  insert into checks (name, expected, actual)
  values ('Ольге без подписки материалы не видны', '0', got);

  -- ===================================================================
  -- 3. Чужие данные не видны даже с активной подпиской
  -- ===================================================================
  begin
    set local role authenticated;
    perform set_config('request.jwt.claims', json_build_object('sub', olga)::text, true);
    select count(*)::text into got from public.measurements;
  exception when others then got := 'ошибка: ' || sqlerrm; end;
  reset role;
  insert into checks (name, expected, actual)
  values ('Ольга не видит замеры Анны', '0', got);

  -- ===================================================================
  -- 4. Незалогиненный посетитель
  -- ===================================================================
  begin
    set local role anon;
    perform set_config('request.jwt.claims', '', true);
    select 'видно ' || count(*)::text into got from public.materials;
  exception when others then got := 'доступ закрыт'; end;
  reset role;
  insert into checks (name, expected, actual)
  values ('Гость не видит материалы', 'доступ закрыт', got);

  -- ===================================================================
  -- 5. Запрещённые действия должны отклоняться
  -- ===================================================================
  begin
    set local role authenticated;
    perform set_config('request.jwt.claims', json_build_object('sub', anna)::text, true);
    insert into public.measurements (user_id, measured_on, weight_kg, waist_cm, hips_cm)
    values (olga, current_date, 60, 70, 95);
    got := 'ПРОПУЩЕНО';
  exception when others then got := 'отклонено'; end;
  reset role;
  insert into checks (name, expected, actual)
  values ('Записать замер на чужое имя', 'отклонено', got);

  begin
    set local role authenticated;
    perform set_config('request.jwt.claims', json_build_object('sub', anna)::text, true);
    update public.profiles set subscription_until = current_date + 999 where user_id = anna;
    got := 'ПРОПУЩЕНО';
  exception when others then got := 'отклонено'; end;
  reset role;
  insert into checks (name, expected, actual)
  values ('Продлить себе подписку', 'отклонено', got);

  begin
    set local role authenticated;
    perform set_config('request.jwt.claims', json_build_object('sub', anna)::text, true);
    insert into public.measurements (user_id, measured_on, weight_kg, waist_cm, hips_cm)
    values (anna, current_date, 500, 70, 95);
    got := 'ПРОПУЩЕНО';
  exception when others then got := 'отклонено'; end;
  reset role;
  insert into checks (name, expected, actual)
  values ('Вес 500 кг (опечатка)', 'отклонено', got);

  begin
    set local role authenticated;
    perform set_config('request.jwt.claims', json_build_object('sub', anna)::text, true);
    update public.materials set title = 'взломано' where true;
    got := 'ПРОПУЩЕНО';
  exception when others then got := 'отклонено'; end;
  reset role;
  insert into checks (name, expected, actual)
  values ('Участница правит контент клуба', 'отклонено', got);
end $$;

select n as "№", name as "проверка", expected as "ожидали", actual as "получили",
       case when expected = actual then 'ок' else 'ПРОВАЛ' end as "итог"
from checks order by n;

select case when count(*) = 0
            then 'ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ'
            else 'ПРОВАЛЕНО ПРОВЕРОК: ' || count(*)::text
       end as "результат"
from checks where expected <> actual;
