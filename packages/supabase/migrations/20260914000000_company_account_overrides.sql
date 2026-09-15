-- A company is the canonical Apollo/enrichment source. This table is the
-- account-private CRM layer: editable presentation fields and vendor details.
create table public.company_account_overrides (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  display_name text,
  overview text,
  phone text,
  industry text,
  website text,
  logo_url text,
  vendor_legal_name text,
  vendor_city text,
  vendor_state text,
  vendor_country text,
  vendor_address text,
  vendor_post_code text,
  vendor_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, account_id)
);

create index company_account_overrides_account_id_idx
  on public.company_account_overrides(account_id);
create index company_account_overrides_company_id_idx
  on public.company_account_overrides(company_id);

alter table public.company_account_overrides enable row level security;
grant select, insert, update, delete on public.company_account_overrides to authenticated;

create policy company_account_overrides_select_member
  on public.company_account_overrides for select to authenticated
  using (is_account_member(account_id));
create policy company_account_overrides_insert_member
  on public.company_account_overrides for insert to authenticated
  with check (is_account_member(account_id));
create policy company_account_overrides_update_member
  on public.company_account_overrides for update to authenticated
  using (is_account_member(account_id))
  with check (is_account_member(account_id));
create policy company_account_overrides_delete_member
  on public.company_account_overrides for delete to authenticated
  using (is_account_member(account_id));

-- Existing account-owned company records become account copies without
-- materializing an override, preserving future Apollo source refreshes.
insert into public.company_account_overrides (company_id, account_id)
select id, account_id
from public.companies
where account_id is not null
on conflict (company_id, account_id) do nothing;

drop policy if exists companies_select_member on public.companies;
create policy companies_select_member
  on public.companies for select to authenticated
  using (
    is_account_member(account_id)
    or exists (
      select 1
      from public.company_account_overrides o
      where o.company_id = companies.id
        and is_account_member(o.account_id)
    )
  );

drop policy if exists companies_vendor_information_select_member on public.companies_vendor_information;
create policy companies_vendor_information_select_member
  on public.companies_vendor_information for select to authenticated
  using (
    is_company_member(company_id)
    or exists (
      select 1
      from public.company_account_overrides o
      where o.company_id = companies_vendor_information.company_id
        and is_account_member(o.account_id)
    )
  );
