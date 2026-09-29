create table if not exists public.project_notification_outbox (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  task_id uuid not null references public.project_tasks(id) on delete cascade,
  event_key text not null check (event_key in ('task_created', 'task_assigned', 'task_status_changed')),
  payload jsonb not null default '{}'::jsonb,
  dedupe_key text not null unique,
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed', 'skipped')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_notification_outbox_queue_idx
  on public.project_notification_outbox(status, next_attempt_at, created_at);
create index if not exists project_notification_outbox_account_idx
  on public.project_notification_outbox(account_id, created_at);

alter table public.project_notification_outbox enable row level security;
grant select, insert, update, delete on public.project_notification_outbox to service_role;

create or replace function public.enqueue_project_notification(
  p_account_id uuid,
  p_task_id uuid,
  p_event_key text,
  p_dedupe_key text,
  p_payload jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.project_notification_outbox(account_id, task_id, event_key, payload, dedupe_key)
  values (p_account_id, p_task_id, p_event_key, coalesce(p_payload, '{}'::jsonb), p_dedupe_key)
  on conflict (dedupe_key) do nothing;
end;
$$;
revoke all on function public.enqueue_project_notification(uuid, uuid, text, text, jsonb) from public;

create or replace function public.project_tasks_enqueue_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
  v_specific_event text;
begin
  select account_id into v_account_id from public.projects where id = new.project_id;
  if v_account_id is null then return new; end if;

  if tg_op = 'INSERT' then
    perform public.enqueue_project_notification(v_account_id, new.id, 'task_created', 'task_created:' || new.id, jsonb_build_object('actor_user_id', new.assigned_by));
  elsif old.status is distinct from new.status then
    v_specific_event := case
      when new.status = 'completed' then 'task_completed'
      when new.status = 'blocked' then 'task_blocked'
      when old.status = 'blocked' then 'task_unblocked'
      else null
    end;
    perform public.enqueue_project_notification(v_account_id, new.id, 'task_status_changed', 'task_status_changed:' || new.id || ':' || new.updated_at, jsonb_build_object('actor_user_id', new.assigned_by, 'specific_event_key', v_specific_event));
  end if;
  return new;
end;
$$;
revoke all on function public.project_tasks_enqueue_notifications() from public;
grant execute on function public.project_tasks_enqueue_notifications() to authenticated, service_role;

drop trigger if exists trg_project_tasks_enqueue_notifications on public.project_tasks;
create trigger trg_project_tasks_enqueue_notifications
after insert or update of status on public.project_tasks
for each row execute function public.project_tasks_enqueue_notifications();

create or replace function public.project_task_assignees_enqueue_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
  v_project_id uuid;
  v_created_at timestamptz;
  v_initial_assignment boolean;
begin
  select p.account_id, t.project_id, t.created_at
    into v_account_id, v_project_id, v_created_at
    from public.project_tasks t
    join public.projects p on p.id = t.project_id
   where t.id = new.task_id;
  if v_account_id is null then return new; end if;

  v_initial_assignment := v_created_at >= now() - interval '30 seconds';
  perform public.enqueue_project_notification(
    v_account_id,
    new.task_id,
    'task_assigned',
    'task_assigned:' || new.id,
    jsonb_build_object('assignee_id', new.user_id, 'initial_assignment', v_initial_assignment)
  );
  return new;
end;
$$;
revoke all on function public.project_task_assignees_enqueue_notifications() from public;
grant execute on function public.project_task_assignees_enqueue_notifications() to authenticated, service_role;

drop trigger if exists trg_project_task_assignees_enqueue_notifications on public.project_task_assignees;
create trigger trg_project_task_assignees_enqueue_notifications
after insert on public.project_task_assignees
for each row execute function public.project_task_assignees_enqueue_notifications();

create or replace function public.claim_project_notification_outbox(p_limit integer default 50)
returns setof public.project_notification_outbox
language sql
security definer
set search_path = public
as $$
  with candidates as (
    select id
      from public.project_notification_outbox
     where (status in ('pending', 'failed') and next_attempt_at <= now())
        or (status = 'processing' and locked_at < now() - interval '15 minutes')
     order by created_at
     for update skip locked
     limit greatest(1, least(p_limit, 500))
  )
  update public.project_notification_outbox o
     set status = 'processing', locked_at = now(), updated_at = now()
    from candidates
   where o.id = candidates.id
  returning o.*;
$$;

revoke all on function public.claim_project_notification_outbox(integer) from public;
grant execute on function public.claim_project_notification_outbox(integer) to service_role;

notify pgrst, 'reload schema';
