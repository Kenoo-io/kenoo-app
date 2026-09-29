create table if not exists public.project_slack_notification_rules (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  channel_id uuid not null references public.project_slack_channels(id) on delete cascade,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_slack_notification_rule_events (
  rule_id uuid not null references public.project_slack_notification_rules(id) on delete cascade,
  event_key text not null,
  primary key (rule_id, event_key)
);

create table if not exists public.project_slack_notification_rule_projects (
  rule_id uuid not null references public.project_slack_notification_rules(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  primary key (rule_id, project_id)
);

create index if not exists project_slack_notification_rules_account_idx on public.project_slack_notification_rules(account_id);
create index if not exists project_slack_notification_rules_channel_idx on public.project_slack_notification_rules(channel_id);
create index if not exists project_slack_notification_rule_projects_project_idx on public.project_slack_notification_rule_projects(project_id);

alter table public.project_slack_notification_rules enable row level security;
alter table public.project_slack_notification_rule_events enable row level security;
alter table public.project_slack_notification_rule_projects enable row level security;

grant select, insert, update, delete on public.project_slack_notification_rules to service_role;
grant select, insert, update, delete on public.project_slack_notification_rule_events to service_role;
grant select, insert, update, delete on public.project_slack_notification_rule_projects to service_role;

notify pgrst, 'reload schema';
