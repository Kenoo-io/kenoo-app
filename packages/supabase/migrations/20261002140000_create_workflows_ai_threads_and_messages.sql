-- Persist Kenoo AI conversations used by the Workflows email builder.
create table public.workflows_ai_threads (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  template_id uuid references public.workflows_templates(id) on delete set null,
  title text,
  status text not null default 'active'
    check (status in ('active', 'archived')),
  context jsonb not null default '{}'::jsonb
    check (jsonb_typeof(context) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, account_id)
);

create index workflows_ai_threads_account_updated_idx
  on public.workflows_ai_threads(account_id, updated_at desc);

create index workflows_ai_threads_account_status_updated_idx
  on public.workflows_ai_threads(account_id, status, updated_at desc);

create table public.workflows_ai_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null,
  account_id uuid not null references public.accounts(id) on delete cascade,
  role text not null
    check (role in ('system', 'user', 'assistant', 'tool')),
  content text,
  parts jsonb not null default '[]'::jsonb
    check (jsonb_typeof(parts) = 'array'),
  model text,
  provider text,
  status text not null default 'completed'
    check (status in ('pending', 'streaming', 'completed', 'failed')),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  error_message text,
  created_at timestamptz not null default now(),
  foreign key (thread_id, account_id)
    references public.workflows_ai_threads(id, account_id)
    on delete cascade
);

create index workflows_ai_messages_thread_created_idx
  on public.workflows_ai_messages(thread_id, created_at asc);

create index workflows_ai_messages_account_created_idx
  on public.workflows_ai_messages(account_id, created_at desc);

alter table public.workflows_ai_threads enable row level security;
alter table public.workflows_ai_messages enable row level security;

grant select, insert, update, delete
  on public.workflows_ai_threads to authenticated;

grant select, insert, update, delete
  on public.workflows_ai_messages to authenticated;

create policy workflows_ai_threads_select_member
  on public.workflows_ai_threads for select to authenticated
  using ((select public.is_account_member(account_id)));

create policy workflows_ai_threads_insert_member
  on public.workflows_ai_threads for insert to authenticated
  with check ((select public.is_account_member(account_id)));

create policy workflows_ai_threads_update_member
  on public.workflows_ai_threads for update to authenticated
  using ((select public.is_account_member(account_id)))
  with check ((select public.is_account_member(account_id)));

create policy workflows_ai_threads_delete_member
  on public.workflows_ai_threads for delete to authenticated
  using ((select public.is_account_member(account_id)));

create policy workflows_ai_messages_select_member
  on public.workflows_ai_messages for select to authenticated
  using ((select public.is_account_member(account_id)));

create policy workflows_ai_messages_insert_member
  on public.workflows_ai_messages for insert to authenticated
  with check ((select public.is_account_member(account_id)));

create policy workflows_ai_messages_update_member
  on public.workflows_ai_messages for update to authenticated
  using ((select public.is_account_member(account_id)))
  with check ((select public.is_account_member(account_id)));

create policy workflows_ai_messages_delete_member
  on public.workflows_ai_messages for delete to authenticated
  using ((select public.is_account_member(account_id)));
