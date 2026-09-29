-- Workflow definitions, immutable graph versions, and runtime execution history.
-- The graph itself is stored as JSONB so the editor can evolve without requiring
-- a schema migration for every new node or edge type.

create table public.flow_workflows (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'paused', 'archived')),
  reentry_policy text not null default 'allow'
    check (reentry_policy in ('allow', 'once_per_person', 'once_ever')),
  active_version_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, account_id)
);

create index flow_workflows_account_status_idx
  on public.flow_workflows(account_id, status, updated_at desc);

create index flow_workflows_active_version_idx
  on public.flow_workflows(active_version_id)
  where active_version_id is not null;

create table public.flow_workflow_versions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  workflow_id uuid not null,
  version_number integer not null check (version_number > 0),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  definition jsonb not null default '{"nodes":[],"edges":[]}'::jsonb
    check (jsonb_typeof(definition) = 'object'),
  trigger_event_id uuid references public.flow_events(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, account_id),
  unique (workflow_id, version_number),
  foreign key (workflow_id, account_id)
    references public.flow_workflows(id, account_id)
    on delete cascade
);

create index flow_workflow_versions_account_workflow_idx
  on public.flow_workflow_versions(account_id, workflow_id, version_number desc);

create index flow_workflow_versions_workflow_account_idx
  on public.flow_workflow_versions(workflow_id, account_id);

create index flow_workflow_versions_trigger_idx
  on public.flow_workflow_versions(account_id, trigger_event_id)
  where status = 'published' and trigger_event_id is not null;

create index flow_workflow_versions_trigger_event_idx
  on public.flow_workflow_versions(trigger_event_id)
  where trigger_event_id is not null;

alter table public.flow_workflows
  add constraint flow_workflows_active_version_fk
  foreign key (active_version_id)
  references public.flow_workflow_versions(id)
  on delete set null;

create table public.flow_workflow_runs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  workflow_id uuid not null,
  workflow_version_id uuid not null,
  audience_id uuid references public.flow_audience(id) on delete set null,
  trigger_occurrence_id uuid references public.flow_event_occurrences(id) on delete set null,
  current_node_id text,
  status text not null default 'waiting'
    check (status in ('waiting', 'running', 'completed', 'canceled', 'failed')),
  next_run_at timestamptz,
  context jsonb not null default '{}'::jsonb,
  last_error text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, account_id),
  unique (account_id, workflow_id, trigger_occurrence_id),
  foreign key (workflow_id, account_id)
    references public.flow_workflows(id, account_id)
    on delete cascade,
  foreign key (workflow_version_id, account_id)
    references public.flow_workflow_versions(id, account_id)
    on delete restrict
);

create index flow_workflow_runs_queue_idx
  on public.flow_workflow_runs(account_id, next_run_at)
  where status in ('waiting', 'running') and next_run_at is not null;

create index flow_workflow_runs_workflow_status_idx
  on public.flow_workflow_runs(account_id, workflow_id, status, created_at desc);

create index flow_workflow_runs_workflow_account_idx
  on public.flow_workflow_runs(workflow_id, account_id);

create index flow_workflow_runs_version_account_idx
  on public.flow_workflow_runs(workflow_version_id, account_id);

create index flow_workflow_runs_trigger_occurrence_idx
  on public.flow_workflow_runs(trigger_occurrence_id)
  where trigger_occurrence_id is not null;

create index flow_workflow_runs_audience_idx
  on public.flow_workflow_runs(account_id, audience_id, created_at desc)
  where audience_id is not null;

create table public.flow_workflow_step_runs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  run_id uuid not null,
  node_id text not null,
  node_type text not null,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'skipped', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error jsonb,
  provider_message_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (run_id, node_id),
  foreign key (run_id, account_id)
    references public.flow_workflow_runs(id, account_id)
    on delete cascade
);

create index flow_workflow_step_runs_queue_idx
  on public.flow_workflow_step_runs(account_id, scheduled_at)
  where status in ('queued', 'running') and scheduled_at is not null;

create index flow_workflow_step_runs_run_idx
  on public.flow_workflow_step_runs(account_id, run_id, created_at);

create index flow_workflow_step_runs_run_account_idx
  on public.flow_workflow_step_runs(run_id, account_id);

alter table public.flow_workflows enable row level security;
alter table public.flow_workflow_versions enable row level security;
alter table public.flow_workflow_runs enable row level security;
alter table public.flow_workflow_step_runs enable row level security;

grant select, insert, update, delete on public.flow_workflows to authenticated;
grant select, insert, update, delete on public.flow_workflow_versions to authenticated;
grant select on public.flow_workflow_runs to authenticated;
grant select on public.flow_workflow_step_runs to authenticated;

create policy flow_workflows_select_member
  on public.flow_workflows for select to authenticated
  using (is_account_member(account_id));

create policy flow_workflows_insert_member
  on public.flow_workflows for insert to authenticated
  with check (is_account_member(account_id));

create policy flow_workflows_update_member
  on public.flow_workflows for update to authenticated
  using (is_account_member(account_id))
  with check (is_account_member(account_id));

create policy flow_workflows_delete_member
  on public.flow_workflows for delete to authenticated
  using (is_account_member(account_id));

create policy flow_workflow_versions_select_member
  on public.flow_workflow_versions for select to authenticated
  using (is_account_member(account_id));

create policy flow_workflow_versions_insert_member
  on public.flow_workflow_versions for insert to authenticated
  with check (is_account_member(account_id));

create policy flow_workflow_versions_update_member
  on public.flow_workflow_versions for update to authenticated
  using (is_account_member(account_id))
  with check (is_account_member(account_id));

create policy flow_workflow_versions_delete_member
  on public.flow_workflow_versions for delete to authenticated
  using (is_account_member(account_id));

create policy flow_workflow_runs_select_member
  on public.flow_workflow_runs for select to authenticated
  using (is_account_member(account_id));

create policy flow_workflow_step_runs_select_member
  on public.flow_workflow_step_runs for select to authenticated
  using (is_account_member(account_id));
