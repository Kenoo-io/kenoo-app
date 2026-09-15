create table public.person_account_overrides (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  first_name text, last_name text, phone text,
  contact_owner uuid references public.users(id) on delete set null,
  status text, crm_source text, notes text,
  custom_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (person_id, account_id)
);
create index person_account_overrides_account_id_idx on public.person_account_overrides(account_id);
create index person_account_overrides_person_id_idx on public.person_account_overrides(person_id);
alter table public.person_account_overrides enable row level security;
grant select, insert, update, delete on public.person_account_overrides to authenticated;
create policy person_account_overrides_select_member on public.person_account_overrides for select to authenticated using (is_account_member(account_id));
create policy person_account_overrides_insert_member on public.person_account_overrides for insert to authenticated with check (is_account_member(account_id));
create policy person_account_overrides_update_member on public.person_account_overrides for update to authenticated using (is_account_member(account_id)) with check (is_account_member(account_id));
create policy person_account_overrides_delete_member on public.person_account_overrides for delete to authenticated using (is_account_member(account_id));
insert into public.person_account_overrides (person_id, account_id) select id, account_id from public.people where account_id is not null on conflict (person_id, account_id) do nothing;
drop policy if exists people_select_member on public.people;
create policy people_select_member on public.people for select to authenticated using (is_account_member(account_id) or exists (select 1 from public.person_account_overrides o where o.person_id = people.id and is_account_member(o.account_id)));
drop policy if exists people_employment_history_select_member on public.people_employment_history;
create policy people_employment_history_select_member on public.people_employment_history for select to authenticated using (is_person_member(person_id) or exists (select 1 from public.person_account_overrides o where o.person_id = people_employment_history.person_id and is_account_member(o.account_id)));
