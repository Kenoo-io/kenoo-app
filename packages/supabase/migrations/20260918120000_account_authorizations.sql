-- A reusable record of an external OAuth client being authorized for a Kenoo
-- account. This is deliberately separate from account_connections, which holds
-- credentials Kenoo uses to connect outward to third-party providers.
create table public.account_authorizations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  authorization_server text not null default 'supabase',
  client_id text not null,
  client_name text,
  resource text not null default 'mcp',
  scopes text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (user_id, authorization_server, client_id, resource)
);

create index account_authorizations_account_id_idx
  on public.account_authorizations(account_id)
  where revoked_at is null;

alter table public.account_authorizations enable row level security;
grant select, insert, update, delete on public.account_authorizations to authenticated;

-- A person can manage only the OAuth authorizations that they granted, and
-- only while they remain a member of the chosen account.
create policy account_authorizations_select_grantor
  on public.account_authorizations for select to authenticated
  using (user_id = (select auth.uid()));

create policy account_authorizations_insert_grantor
  on public.account_authorizations for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (select public.is_account_member(account_id))
  );

create policy account_authorizations_update_grantor
  on public.account_authorizations for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (select public.is_account_member(account_id))
  );

create policy account_authorizations_delete_grantor
  on public.account_authorizations for delete to authenticated
  using (user_id = (select auth.uid()));
