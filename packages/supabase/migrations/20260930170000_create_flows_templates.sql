-- Reusable, account-owned message templates for Flows.
-- Email templates preserve both rich HTML and plain-text representations.
create table public.flows_templates (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null,
  description text,
  channel text not null check (channel in ('email', 'sms', 'push')),
  subject text,
  html_content text,
  text_content text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, name),
  check (
    (channel = 'email' and (html_content is not null or text_content is not null))
    or (channel in ('sms', 'push') and text_content is not null)
  ),
  check (channel = 'email' or (subject is null and html_content is null))
);

create index flows_templates_account_channel_updated_idx
  on public.flows_templates(account_id, channel, updated_at desc);

alter table public.flows_templates enable row level security;

grant select, insert, update, delete on public.flows_templates to authenticated;

create policy flows_templates_select_member
  on public.flows_templates for select to authenticated
  using ((select public.is_account_member(account_id)));

create policy flows_templates_insert_member
  on public.flows_templates for insert to authenticated
  with check ((select public.is_account_member(account_id)));

create policy flows_templates_update_member
  on public.flows_templates for update to authenticated
  using ((select public.is_account_member(account_id)))
  with check ((select public.is_account_member(account_id)));

create policy flows_templates_delete_member
  on public.flows_templates for delete to authenticated
  using ((select public.is_account_member(account_id)));
