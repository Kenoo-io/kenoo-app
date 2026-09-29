create table if not exists public.project_slack_channel_events (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.project_slack_channels(id) on delete cascade,
  event_key text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (channel_id, event_key)
);

create table if not exists public.project_slack_channel_projects (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  channel_id uuid not null references public.project_slack_channels(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (channel_id, project_id)
);

alter table public.project_slack_channel_events enable row level security;
alter table public.project_slack_channel_projects enable row level security;

create index if not exists project_slack_channel_events_channel_idx
  on public.project_slack_channel_events (channel_id, enabled);

create index if not exists project_slack_channel_projects_account_idx
  on public.project_slack_channel_projects (account_id, project_id);

create index if not exists project_slack_channel_projects_channel_idx
  on public.project_slack_channel_projects (channel_id, project_id);

grant select, insert, update, delete on table public.project_slack_channel_events to service_role;
grant select, insert, update, delete on table public.project_slack_channel_projects to service_role;

notify pgrst, 'reload schema';
