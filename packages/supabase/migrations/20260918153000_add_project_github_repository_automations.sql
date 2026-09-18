-- Completion rules belong to a GitHub repository connection, rather than an
-- individual task. Task-to-branch links continue to live in
-- project_task_github_branches.
create table if not exists public.project_github_repository_automations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  connection_id uuid not null references public.account_connections(id) on delete cascade,
  repository_full_name text not null,
  completion_mode text not null default 'deployment'
    check (completion_mode in ('merge', 'deployment')),
  completion_branch text,
  deployment_environment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connection_id, repository_full_name),
  check (
    (completion_mode = 'merge' and completion_branch is not null and deployment_environment is null)
    or (completion_mode = 'deployment' and deployment_environment is not null and completion_branch is null)
  )
);

alter table public.project_github_repository_automations enable row level security;

create index if not exists project_github_repository_automations_lookup_idx
  on public.project_github_repository_automations (connection_id, repository_full_name);
