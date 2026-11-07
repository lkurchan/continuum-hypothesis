-- Disposable local/CI database only. Supabase provisions these roles itself.
create role anon nologin;
create role service_role nologin bypassrls;
grant usage on schema public to anon, service_role;
alter default privileges in schema public grant all on tables to service_role;
