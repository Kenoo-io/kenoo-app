-- Move every former primary assignee into the many-to-many assignment table
-- before removing the obsolete single-assignee column.
insert into public.project_task_assignees (task_id, user_id, assigned_by)
select id, assignee_id, assigned_by
from public.project_tasks
where assignee_id is not null
on conflict (task_id, user_id) do nothing;

alter table public.project_tasks drop column assignee_id;
