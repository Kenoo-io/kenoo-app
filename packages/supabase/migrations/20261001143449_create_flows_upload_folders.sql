-- Account-owned folders for organizing reusable Flows template uploads.
create table public.flows_upload_folders (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  parent_id uuid,
  name text not null check (length(btrim(name)) > 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (account_id, id),
  foreign key (account_id, parent_id)
    references public.flows_upload_folders(account_id, id)
    on delete cascade,
  check (parent_id is null or parent_id <> id)
);

create index flows_upload_folders_account_parent_idx
  on public.flows_upload_folders(account_id, parent_id, name);

create unique index flows_upload_folders_sibling_name_idx
  on public.flows_upload_folders (
    account_id,
    coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(btrim(name))
  );

alter table public.flows_upload_folders enable row level security;

grant select, insert, update, delete on public.flows_upload_folders to authenticated;

create policy flows_upload_folders_select_member
  on public.flows_upload_folders for select to authenticated
  using ((select public.is_account_member(account_id)));

create policy flows_upload_folders_insert_member
  on public.flows_upload_folders for insert to authenticated
  with check ((select public.is_account_member(account_id)));

create policy flows_upload_folders_update_member
  on public.flows_upload_folders for update to authenticated
  using ((select public.is_account_member(account_id)))
  with check ((select public.is_account_member(account_id)));

create policy flows_upload_folders_delete_member
  on public.flows_upload_folders for delete to authenticated
  using ((select public.is_account_member(account_id)));

alter table public.flows_template_uploads
  add column folder_id uuid;

alter table public.flows_template_uploads
  add constraint flows_template_uploads_folder_fkey
  foreign key (account_id, folder_id)
  references public.flows_upload_folders(account_id, id)
  on delete set null;

create index flows_template_uploads_account_folder_idx
  on public.flows_template_uploads(account_id, folder_id, created_at desc);
