-- Preserve the authenticated actor on assignment outbox rows so the worker
-- can suppress notifications when someone assigns a task to themselves.
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
begin
  select p.account_id, t.project_id, t.created_at
    into v_account_id, v_project_id, v_created_at
    from public.project_tasks t
    join public.projects p on p.id = t.project_id
   where t.id = new.task_id;
  if v_account_id is null then return new; end if;

  perform public.enqueue_project_notification(
    v_account_id,
    new.task_id,
    'task_assigned',
    'task_assigned:' || new.id,
    jsonb_build_object(
      'assignee_id', new.user_id,
      'initial_assignment', v_created_at >= now() - interval '30 seconds',
      'actor_user_id', auth.uid()
    )
  );
  return new;
end;
$$;
