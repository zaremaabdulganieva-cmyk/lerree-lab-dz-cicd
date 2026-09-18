-- Локальные демо-участницы. В облаке их создаёт панель Supabase
-- (Authentication → Users), здесь — просто две строки в заглушке.
insert into auth.users (email, raw_user_meta_data) values
  ('anna@demo.ru', '{"name":"Анна"}'),
  ('olga@demo.ru', '{"name":"Ольга"}')
on conflict (email) do nothing;
