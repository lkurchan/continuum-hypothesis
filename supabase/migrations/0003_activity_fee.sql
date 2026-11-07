-- Continuum commission (0.05%) charged to the client after each deposit.
-- A failed fee is recorded as pending with an empty tx_hash.
alter table public.activity drop constraint if exists activity_kind_check;
alter table public.activity add constraint activity_kind_check
    check (kind in ('create', 'topup', 'withdraw', 'cancel', 'agent_payment', 'fee'));
