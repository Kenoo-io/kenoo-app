create table if not exists public.project_slack_overdue_deliveries (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  task_id uuid not null references public.project_tasks(id) on delete cascade,
  rule_id uuid not null references public.project_slack_notification_rules(id) on delete cascade,
  event_key text not null default 'task_overdue',
  -- project_tasks.due_date is a calendar date, not an instant in time.
  due_date date not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (task_id, rule_id, event_key, due_date)
);

create index if not exists project_slack_overdue_deliveries_queue_idx
  on public.project_slack_overdue_deliveries(status, next_attempt_at);
create index if not exists project_slack_overdue_deliveries_account_idx
  on public.project_slack_overdue_deliveries(account_id);

alter table public.project_slack_overdue_deliveries enable row level security;
grant select, insert, update, delete on public.project_slack_overdue_deliveries to service_role;

notify pgrst, 'reload schema';
