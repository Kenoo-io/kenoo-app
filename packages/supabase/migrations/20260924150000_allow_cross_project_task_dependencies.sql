-- Task dependencies may span projects, but they must remain inside the same
-- Kenoo account. Project membership/access is enforced separately by RLS and
-- the application/MCP access checks.
create or replace function public.validate_project_task_dependency()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
declare
  blocking_account_id uuid;
  blocker_account_id uuid;
  introduces_cycle boolean;
begin
  select projects.account_id
    into blocking_account_id
    from public.project_tasks
    join public.projects on projects.id = project_tasks.project_id
   where project_tasks.id = new.blocking_task_id;

  select projects.account_id
    into blocker_account_id
    from public.project_tasks
    join public.projects on projects.id = project_tasks.project_id
   where project_tasks.id = new.blocker_task_id;

  if blocking_account_id is null or blocker_account_id is null then
    raise exception 'Both task dependency targets must exist';
  end if;

  if blocking_account_id is distinct from blocker_account_id then
    raise exception 'Task dependencies must remain within the same Kenoo account';
  end if;

  with recursive reachable(task_id) as (
    select dependency.blocker_task_id
      from public.project_task_dependencies dependency
     where dependency.blocking_task_id = new.blocker_task_id

    union

    select dependency.blocker_task_id
      from public.project_task_dependencies dependency
      join reachable on dependency.blocking_task_id = reachable.task_id
  )
  select exists (
    select 1
      from reachable
     where task_id = new.blocking_task_id
  )
    into introduces_cycle;

  if introduces_cycle then
    raise exception 'Task dependency would create a cycle';
  end if;

  return new;
end;
$function$;
