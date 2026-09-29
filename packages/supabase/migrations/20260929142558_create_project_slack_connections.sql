-- Slack installations are stored in account_connections. This table stores the
-- channels selected by a Kenoo account for outbound Projects notifications.
create table if not exists public.project_slack_channels (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  connection_id uuid not null references public.account_connections(id) on delete cascade,
  slack_channel_id text not null,
  slack_channel_name text not null,
  is_private boolean not null default false,
  enabled boolean not null default true,
  event_task_completed boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connection_id, slack_channel_id)
);

alter table public.project_slack_channels enable row level security;

create index if not exists project_slack_channels_account_idx
  on public.project_slack_channels (account_id, enabled);

create index if not exists project_slack_channels_connection_idx
  on public.project_slack_channels (connection_id, enabled);
