create table if not exists public.slack_workspace_users (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  connection_id uuid not null references public.account_connections(id) on delete cascade,
  slack_user_id text not null,
  slack_email text,
  slack_display_name text not null,
  active boolean not null default true,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connection_id, slack_user_id)
);

create index if not exists slack_workspace_users_connection_idx
  on public.slack_workspace_users(connection_id, active, synced_at);

alter table public.slack_workspace_users enable row level security;
grant select, insert, update, delete on public.slack_workspace_users to service_role;

notify pgrst, 'reload schema';
