create table public.project_notification_preferences (
  user_id uuid primary key references public.users(id) on delete cascade,
  task_assigned_email boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_notification_preferences enable row level security;
grant select, insert, update on public.project_notification_preferences to authenticated;

create policy project_notification_preferences_select_self
  on public.project_notification_preferences for select to authenticated
  using (user_id = auth.uid());
create policy project_notification_preferences_insert_self
  on public.project_notification_preferences for insert to authenticated
  with check (user_id = auth.uid());
create policy project_notification_preferences_update_self
  on public.project_notification_preferences for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
