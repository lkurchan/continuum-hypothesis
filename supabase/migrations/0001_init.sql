begin;

create table public.users (
    id text primary key,
    name text not null,
    role text not null check (role in ('payer', 'worker')),
    address text not null check (address ~ '^0x[0-9a-fA-F]{40}$'),
    belo_address text check (belo_address ~ '^0x[0-9a-fA-F]{40}$'),
    avatar_url text
);

create table public.streams (
    id text primary key,
    payer_id text not null references public.users(id),
    worker_id text not null references public.users(id),
    label text,
    created_tx text not null,
    created_at timestamptz not null default now()
);

create index streams_payer_id_idx on public.streams(payer_id);
create index streams_worker_id_idx on public.streams(worker_id);

create table public.activity (
    id uuid primary key default gen_random_uuid(),
    stream_id text not null references public.streams(id),
    kind text not null check (kind in ('create', 'topup', 'withdraw', 'cancel', 'agent_payment')),
    amount numeric not null check (amount >= 0),
    tx_hash text not null,
    user_id text not null references public.users(id),
    note text,
    created_at timestamptz not null default now()
);

create index activity_user_created_at_idx on public.activity(user_id, created_at desc);
create index activity_stream_id_idx on public.activity(stream_id);

create table public.agent_rules (
    id uuid primary key default gen_random_uuid(),
    worker_id text not null references public.users(id),
    label text not null,
    kind text not null check (kind in ('fixed', 'percent')),
    amount numeric check (amount >= 0),
    percent numeric check (percent between 0 and 100),
    day_of_month integer not null check (day_of_month between 1 and 31),
    destination text not null,
    active boolean not null default true
);

create index agent_rules_worker_id_idx on public.agent_rules(worker_id);

-- Access goes through server-side route handlers using the service role.
-- Demo userId is not authentication; do not expose these tables to anon clients.
alter table public.users enable row level security;
alter table public.streams enable row level security;
alter table public.activity enable row level security;
alter table public.agent_rules enable row level security;

commit;
