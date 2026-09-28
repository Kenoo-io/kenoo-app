-- Immutable event deliveries received from external applications.
-- The occurrence is the durable trigger input for future workflow runs and
-- the source for event-level metrics.
create table public.flow_event_occurrences (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  event_id uuid not null references public.flow_events(id) on delete cascade,
  event_key text not null,
  api_key_id uuid references public.platform_api_keys(id) on delete set null,
  external_id text,
  idempotency_key text,
  payload jsonb not null default '{}'::jsonb,
  context jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (account_id, idempotency_key)
);

create index flow_event_occurrences_account_event_time_idx
  on public.flow_event_occurrences(account_id, event_id, occurred_at desc);

create index flow_event_occurrences_account_key_time_idx
  on public.flow_event_occurrences(account_id, event_key, occurred_at desc);

create index flow_event_occurrences_external_id_idx
  on public.flow_event_occurrences(account_id, external_id)
  where external_id is not null;

alter table public.flow_event_occurrences enable row level security;

grant select on public.flow_event_occurrences to authenticated;

create policy flow_event_occurrences_select_member
  on public.flow_event_occurrences for select to authenticated
  using (is_account_member(account_id));
