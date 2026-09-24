begin;

alter table public.project_members
  add constraint project_members_role_check
  check (role in ('member', 'owner'));

insert into public.project_members (project_id, user_id, role)
select p.id, p.owner_id, 'owner'
from public.projects p
where p.owner_id is not null
on conflict (project_id, user_id)
do update set role = 'owner', updated_at = now();

create or replace function public.is_project_owner(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select exists (
    select 1
    from public.project_members pm
    where pm.project_id = target_project_id
      and pm.user_id = (select auth.uid())
      and pm.role = 'owner'
  );
$function$;

create or replace function public.is_project_accessible(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select exists (
    select 1
    from public.projects p
    join public.project_members pm
      on pm.project_id = p.id
     and pm.user_id = (select auth.uid())
    where p.id = target_project_id
      and public.is_project_account_member(p.account_id)
  );
$function$;

create or replace function public.set_project_creator_as_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if (select auth.uid()) is not null then
    insert into public.project_members (project_id, user_id, role)
    values (new.id, (select auth.uid()), 'owner')
    on conflict (project_id, user_id)
    do update set role = 'owner', updated_at = now();
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_projects_creator_as_owner on public.projects;
create trigger trg_projects_creator_as_owner
after insert on public.projects
for each row execute function public.set_project_creator_as_owner();

drop policy if exists projects_delete_accessible on public.projects;
drop policy if exists projects_insert_member on public.projects;
drop policy if exists projects_select_accessible on public.projects;
drop policy if exists projects_update_accessible on public.projects;

create policy projects_delete_owner
on public.projects
for delete
to authenticated
using (
  public.is_project_account_member(account_id)
  and public.is_project_owner(id)
);

create policy projects_insert_member
on public.projects
for insert
to authenticated
with check (public.is_project_account_member(account_id));

create policy projects_select_accessible
on public.projects
for select
to authenticated
using (
  public.is_project_account_member(account_id)
  and public.is_project_accessible(id)
);

create policy projects_update_accessible
on public.projects
for update
to authenticated
using (
  public.is_project_account_member(account_id)
  and public.is_project_accessible(id)
)
with check (public.is_project_account_member(account_id));

drop policy if exists project_members_delete_accessible on public.project_members;
drop policy if exists project_members_insert_accessible on public.project_members;
drop policy if exists project_members_select_accessible on public.project_members;
drop policy if exists project_members_update_accessible on public.project_members;

create policy project_members_delete_owner_or_self
on public.project_members
for delete
to authenticated
using (
  public.is_project_owner(project_id)
  or user_id = (select auth.uid())
);

create policy project_members_insert_owner
on public.project_members
for insert
to authenticated
with check (public.is_project_owner(project_id));

create policy project_members_select_accessible
on public.project_members
for select
to authenticated
using (public.is_project_accessible(project_id));

create policy project_members_update_owner
on public.project_members
for update
to authenticated
using (public.is_project_owner(project_id))
with check (public.is_project_owner(project_id));

drop index if exists public.idx_projects_owner;
alter table public.projects drop column owner_id;

commit;
