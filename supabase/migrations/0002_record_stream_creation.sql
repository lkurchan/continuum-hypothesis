begin;

-- The chain receipt is already confirmed; metadata and its activities commit together.
create function public.record_stream_creation(p_streams jsonb, p_activity jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
    insert into public.streams (id, payer_id, worker_id, label, created_tx, created_at)
    select id, payer_id, worker_id, label, created_tx, created_at
    from jsonb_to_recordset(p_streams) as rows(
        id text, payer_id text, worker_id text, label text, created_tx text, created_at timestamptz
    );

    insert into public.activity (id, stream_id, kind, amount, tx_hash, user_id, note, created_at)
    select id, stream_id, kind, amount, tx_hash, user_id, note, created_at
    from jsonb_to_recordset(p_activity) as rows(
        id uuid, stream_id text, kind text, amount numeric, tx_hash text,
        user_id text, note text, created_at timestamptz
    );
end;
$$;

revoke all on function public.record_stream_creation(jsonb, jsonb) from public;
grant execute on function public.record_stream_creation(jsonb, jsonb) to service_role;

commit;
