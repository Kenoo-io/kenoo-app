-- Flow-owned audience records. These are intentionally separate from CRM people.
-- A later migration can add an optional link to public.people without changing
-- the event ingestion contract.
create table public.flow_audience (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  audience_key text not null,
  source text,
  external_id text,
  email text,
  email_normalized text,
  full_name text,
  first_name text,
  last_name text,
  phone text,
  company text,
  job_title text,
  custom_payload jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  event_count integer not null default 1 check (event_count > 0),
  first_event_id uuid references public.flow_event_occurrences(id) on delete set null,
  last_event_id uuid references public.flow_event_occurrences(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, audience_key)
);

create unique index flow_audience_account_email_idx
  on public.flow_audience(account_id, email_normalized)
  where email_normalized is not null;

create index flow_audience_account_last_seen_idx
  on public.flow_audience(account_id, last_seen_at desc);

create index flow_audience_account_source_idx
  on public.flow_audience(account_id, source)
  where source is not null;

create index flow_audience_account_external_id_idx
  on public.flow_audience(account_id, external_id)
  where external_id is not null;

alter table public.flow_audience enable row level security;

grant select, insert, update, delete on public.flow_audience to authenticated;

create policy flow_audience_select_member
  on public.flow_audience for select to authenticated
  using (is_account_member(account_id));

create policy flow_audience_insert_member
  on public.flow_audience for insert to authenticated
  with check (is_account_member(account_id));

create policy flow_audience_update_member
  on public.flow_audience for update to authenticated
  using (is_account_member(account_id))
  with check (is_account_member(account_id));

create policy flow_audience_delete_member
  on public.flow_audience for delete to authenticated
  using (is_account_member(account_id));
