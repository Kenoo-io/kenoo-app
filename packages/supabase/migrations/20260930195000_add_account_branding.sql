create table if not exists public.account_branding (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  primary_color text not null default '#111111' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  secondary_color text not null default '#f4f4f5' check (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  dark_logo_url text,
  light_logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.account_branding enable row level security;
grant select, insert, update on public.account_branding to authenticated;

create policy account_branding_select_member
  on public.account_branding for select to authenticated
  using (is_account_member(account_id));

create policy account_branding_insert_member
  on public.account_branding for insert to authenticated
  with check (is_account_member(account_id));

create policy account_branding_update_member
  on public.account_branding for update to authenticated
  using (is_account_member(account_id))
  with check (is_account_member(account_id));
