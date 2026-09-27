-- =====================================================================
-- Миграция 006 — исправления по аудиту безопасности
--
-- Подробности по каждому пункту — в security_audit.md (SEC-01, 02, 04).
-- Выполнять после 005. Повторный запуск безопасен.
-- =====================================================================

-- ---------------------------------------------------------------------
-- SEC-01. Новая учётная запись получала подписку на 30 дней.
--
-- Регистрация в Supabase открыта (и должна остаться открытой: без неё
-- не заработает вход через Google). А у карточки профиля по умолчанию
-- стояло «подписка активна, ещё 30 дней». Итог: любой, кто
-- зарегистрировался бы через API с публичным ключом, получал весь
-- платный контент.
--
-- Теперь новая карточка создаётся с истёкшей подпиской. Доступ выдаёт
-- только администратор — так же, как в настоящем клубе после оплаты.
-- ---------------------------------------------------------------------
alter table public.profiles
  alter column subscription_status set default 'expired',
  alter column subscription_until  set default (current_date - 1);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Подписку задаём явно, а не полагаемся на значения по умолчанию:
  -- так доступ не откроется случайно, если их кто-то снова поменяет.
  insert into public.profiles (user_id, name, subscription_status, subscription_until)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'name', ''),
      nullif(new.raw_user_meta_data->>'full_name', ''),
      split_part(new.email, '@', 1)
    ),
    'expired',
    current_date - 1
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- SEC-02. Любой посетитель мог сменить пароль демо-участницы.
--
-- Пароль демо-доступа опубликован в README — для проверяющего. Но с ним
-- можно не только войти, но и вызвать «сменить пароль» — и следующий
-- проверяющий уже не попадёт в кабинет. Запрещаем менять пароль и почту
-- у демо-учётных записей на уровне базы: обойти это из браузера нельзя.
-- ---------------------------------------------------------------------
create or replace function public.guard_demo_accounts()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.email in ('anna@demo.ru', 'olga@demo.ru')
     and (new.encrypted_password is distinct from old.encrypted_password
          or new.email is distinct from old.email) then
    raise exception 'Демо-доступ нельзя изменить' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists demo_accounts_guard on auth.users;
create trigger demo_accounts_guard
  before update on auth.users
  for each row execute function public.guard_demo_accounts();

-- ---------------------------------------------------------------------
-- SEC-04. Функции проверки доступа вызывались без входа.
--
-- В Postgres новая функция по умолчанию доступна всем, в том числе гостю.
-- Через API можно было спросить «эта учётная запись — админ?» про любой
-- идентификатор. Политикам доступа функции нужны только для вошедших.
-- ---------------------------------------------------------------------
revoke execute on function public.is_active_member(uuid) from public, anon;
revoke execute on function public.is_admin(uuid)         from public, anon;
grant  execute on function public.is_active_member(uuid) to authenticated;
grant  execute on function public.is_admin(uuid)         to authenticated;
