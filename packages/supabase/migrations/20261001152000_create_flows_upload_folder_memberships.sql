-- Allow an uploaded image to belong to multiple account-owned folders.
create table public.flows_template_upload_folder_memberships (
  account_id uuid not null references public.accounts(id) on delete cascade,
  upload_id uuid not null references public.flows_template_uploads(id) on delete cascade,
  folder_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (account_id, upload_id, folder_id),
  foreign key (account_id, folder_id)
    references public.flows_upload_folders(account_id, id)
    on delete cascade
);

create index flows_upload_folder_memberships_folder_idx
  on public.flows_template_upload_folder_memberships(account_id, folder_id, created_at desc);

alter table public.flows_template_upload_folder_memberships enable row level security;

grant select, insert, delete on public.flows_template_upload_folder_memberships to authenticated;

create policy flows_upload_folder_memberships_select_member
  on public.flows_template_upload_folder_memberships for select to authenticated
  using ((select public.is_account_member(account_id)));

create policy flows_upload_folder_memberships_insert_member
  on public.flows_template_upload_folder_memberships for insert to authenticated
  with check ((select public.is_account_member(account_id)));

create policy flows_upload_folder_memberships_delete_member
  on public.flows_template_upload_folder_memberships for delete to authenticated
  using ((select public.is_account_member(account_id)));

-- Backfill existing single-folder assignments into the new membership table.
insert into public.flows_template_upload_folder_memberships (account_id, upload_id, folder_id)
select account_id, id, folder_id
from public.flows_template_uploads
where folder_id is not null
on conflict do nothing;
