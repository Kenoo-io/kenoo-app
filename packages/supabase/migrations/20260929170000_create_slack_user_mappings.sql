create table if not exists public.slack_user_mappings (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  connection_id uuid not null references public.account_connections(id) on delete cascade,
  kenoo_user_id uuid not null references public.users(id) on delete cascade,
  slack_user_id text not null,
  slack_email text,
  slack_display_name text,
  active boolean not null default true,
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connection_id, kenoo_user_id),
  unique (connection_id, slack_user_id)
);

create index if not exists slack_user_mappings_account_idx
  on public.slack_user_mappings(account_id, active);

alter table public.slack_user_mappings enable row level security;
grant select, insert, update, delete on public.slack_user_mappings to service_role;

notify pgrst, 'reload schema';
