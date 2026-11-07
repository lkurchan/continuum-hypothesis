\set ON_ERROR_STOP on
begin;

-- Seed must not overwrite configured wallets when it is run again.
update public.users set address = '0x1111111111111111111111111111111111111111' where id = 'platform';
\ir ../seed.sql
do $$ begin
    if (select count(*) from public.users) <> 3 or
       (select address from public.users where id = 'platform') <> '0x1111111111111111111111111111111111111111' then
        raise exception 'Seed is not idempotent or overwrote a configured wallet';
    end if;
end $$;

-- Exercise the same RPC role and JSON input used by the backend.
set local role service_role;
select public.record_stream_creation(
    '[{"id":"ci-1","payer_id":"platform","worker_id":"worker1","created_tx":"ci:confirmed","created_at":"2026-11-07T12:00:00Z"}]',
    '[{"id":"11111111-1111-4111-8111-111111111111","stream_id":"ci-1","kind":"create","amount":"123456789012345678901234567890.123456789012345678","tx_hash":"ci:confirmed","user_id":"platform","created_at":"2026-11-07T12:00:00Z"}]'
);
do $$ begin
    if (select amount::text from public.activity where stream_id = 'ci-1') is distinct from
       '123456789012345678901234567890.123456789012345678' then
        raise exception 'Amount lost decimal precision';
    end if;
    begin
        perform public.record_stream_creation(
            '[{"id":"ci-rollback","payer_id":"platform","worker_id":"worker1","created_tx":"ci:failed","created_at":"2026-11-07T12:00:00Z"}]',
            '[{"id":"22222222-2222-4222-8222-222222222222","stream_id":"ci-rollback","kind":"create","amount":"1","tx_hash":"ci:failed","user_id":"missing-user","created_at":"2026-11-07T12:00:00Z"}]'
        );
        raise exception 'Invalid activity was accepted';
    exception when foreign_key_violation then null;
    end;
    if exists (select 1 from public.streams where id = 'ci-rollback') or
       exists (select 1 from public.activity where tx_hash = 'ci:failed') then
        raise exception 'RPC did not roll back metadata and activity together';
    end if;
end $$;
insert into public.agent_rules (worker_id, label, kind, amount, day_of_month, destination)
values ('worker1', 'CI rule', 'fixed', 1, 1, 'wallet');
reset role;

-- Even with table privileges, anon cannot bypass RLS or invoke the mutation RPC.
grant select, insert on all tables in schema public to anon;
set local role anon;
do $$ begin
    if exists (select 1 from public.users) or exists (select 1 from public.streams) or
       exists (select 1 from public.activity) or exists (select 1 from public.agent_rules) then
        raise exception 'RLS leaked server-only rows to anon';
    end if;
    begin
        perform public.record_stream_creation('[]', '[]');
        raise exception 'Anon can execute the mutation RPC';
    exception when insufficient_privilege then null;
    end;
    begin
        insert into public.users (id, name, role, address)
        values ('ci-anon', 'Anonymous', 'worker', '0x2222222222222222222222222222222222222222');
        raise exception 'Anon can insert server-only rows';
    exception when insufficient_privilege then null;
    end;
end $$;
reset role;
rollback;
\echo 'Backend SQL checks passed: seed, exact amounts, atomic RPC, service role and anon isolation.'
