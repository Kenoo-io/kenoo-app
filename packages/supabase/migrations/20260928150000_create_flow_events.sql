-- Account-owned event definitions used as triggers for Flows.
-- Default events can be added later by inserting normal account rows.
create table public.flow_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  key text not null check (key ~ '^[a-z][a-z0-9_]*$'),
  name text not null,
  description text,
  payload_schema jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, key)
);

create index flow_events_account_id_idx
  on public.flow_events(account_id);

alter table public.flow_events enable row level security;

grant select, insert, update, delete on public.flow_events to authenticated;

create policy flow_events_select_member
  on public.flow_events for select to authenticated
  using (is_account_member(account_id));

create policy flow_events_insert_member
  on public.flow_events for insert to authenticated
  with check (is_account_member(account_id));

create policy flow_events_update_member
  on public.flow_events for update to authenticated
  using (is_account_member(account_id))
  with check (is_account_member(account_id));

create policy flow_events_delete_member
  on public.flow_events for delete to authenticated
  using (is_account_member(account_id));
