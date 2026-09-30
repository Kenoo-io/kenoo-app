alter table public.alert_subscriptions
  add column if not exists notify_internal boolean not null default true;

comment on column public.alert_subscriptions.notify_internal is
  'Whether this alert may create an in-app notification for the recipient.';

create or replace function public.projects_filter_internal_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  project_account_id uuid;
begin
  if coalesce(new.type, '') <> 'projects' then
    return new;
  end if;

  select p.account_id
    into project_account_id
    from public.projects p
   where p.id = nullif(new.metadata ->> 'project_id', '')::uuid;

  if project_account_id is null then
    return new;
  end if;

  if exists (
    select 1
      from public.alert_subscriptions s
     where s.account_id = project_account_id
       and s.user_id = new.user_id
       and s.app_slug = 'projects'
       and s.alert_key = 'projects.internal'
       and s.notify_internal = false
  ) then
    return null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_projects_filter_internal_notification on public.user_notifications;
create trigger trg_projects_filter_internal_notification
before insert on public.user_notifications
for each row execute function public.projects_filter_internal_notification();
