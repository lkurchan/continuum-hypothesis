-- Placeholders only: replace zero addresses before enabling real transactions.
-- Keys belong in DEMO_PK_PLATFORM, DEMO_PK_WORKER1 and DEMO_PK_WORKER2.
-- Re-running this seed preserves any real wallet addresses already configured.
insert into public.users (id, name, role, address)
values
    ('platform', 'Plataforma demo', 'payer', '0x0000000000000000000000000000000000000000'),
    ('worker1', 'Ana García', 'worker', '0x0000000000000000000000000000000000000000'),
    ('worker2', 'Martín López', 'worker', '0x0000000000000000000000000000000000000000')
on conflict (id) do nothing;
