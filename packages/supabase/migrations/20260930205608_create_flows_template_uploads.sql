-- Reusable account-owned image metadata for the Flows email template editor.
create table public.flows_template_uploads (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  original_name text not null,
  storage_key text not null unique,
  public_url text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index flows_template_uploads_account_created_idx
  on public.flows_template_uploads(account_id, created_at desc);

alter table public.flows_template_uploads enable row level security;

grant select, insert, update, delete on public.flows_template_uploads to authenticated;

create policy flows_template_uploads_select_member
  on public.flows_template_uploads for select to authenticated
  using ((select public.is_account_member(account_id)));

create policy flows_template_uploads_insert_member
  on public.flows_template_uploads for insert to authenticated
  with check ((select public.is_account_member(account_id)));

create policy flows_template_uploads_update_member
  on public.flows_template_uploads for update to authenticated
  using ((select public.is_account_member(account_id)))
  with check ((select public.is_account_member(account_id)));

create policy flows_template_uploads_delete_member
  on public.flows_template_uploads for delete to authenticated
  using ((select public.is_account_member(account_id)));
