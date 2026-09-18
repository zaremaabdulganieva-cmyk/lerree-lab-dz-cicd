-- =====================================================================
-- Демо-участницы одним запросом — вместо ручного «Add user» в панели.
--
-- Заводит anna@demo.ru и olga@demo.ru с паролем demo1234, сразу
-- подтверждёнными. Выполнять в SQL Editor ПЕРЕД миграцией 004.
-- Повторный запуск безопасен: существующие участницы пропускаются.
--
-- Проверено на живом Supabase 18.09.2026: вход работает, триггер
-- регистрации из миграции 001 сам создаёт карточки в profiles.
--
-- Пустые строки в полях *_token обязательны: с NULL в этих полях
-- сервис входа Supabase отвечает ошибкой при попытке войти.
-- =====================================================================

do $$
declare
  u record;
  new_id uuid;
begin
  for u in select * from (values ('anna@demo.ru', 'Анна'), ('olga@demo.ru', 'Ольга')) as t(email, name)
  loop
    if exists (select 1 from auth.users where email = u.email) then
      continue;
    end if;

    new_id := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', new_id, 'authenticated', 'authenticated',
      u.email, extensions.crypt('demo1234', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', json_build_object('name', u.name),
      now(), now(), '', '', '', ''
    );

    insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      new_id::text, new_id,
      json_build_object('sub', new_id::text, 'email', u.email, 'email_verified', true),
      'email', now(), now(), now()
    );
  end loop;
end $$;
