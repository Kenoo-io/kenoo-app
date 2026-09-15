-- One GitHub branch per Projects task. This is intentionally server-route only:
-- authenticated users have no direct table policies.
create table if not exists public.project_task_github_branches (
  task_id uuid primary key references public.project_tasks(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  connection_id uuid not null references public.account_connections(id) on delete restrict,
  repository_full_name text not null,
  base_branch text not null,
  base_sha text not null,
  branch_name text not null,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (repository_full_name, branch_name)
);

alter table public.project_task_github_branches enable row level security;

create index if not exists project_task_github_branches_repo_branch_idx
  on public.project_task_github_branches (repository_full_name, branch_name);

-- GitHub retries carry the same delivery id. Keep a durable receipt before a
-- transition so a replay cannot run the same state update twice.
create table if not exists public.project_github_webhook_deliveries (
  delivery_id text primary key,
  event_name text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  payload_hash text not null
);

alter table public.project_github_webhook_deliveries enable row level security;
