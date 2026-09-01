-- Job queue for Kenoo systems workers (people enrichment first).
-- Service-role only: no anon/authenticated policies.

create table if not exists public.systems_jobs (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  account_id uuid,
  api_key_id uuid,
  product_id uuid,
  request_id text,
  input jsonb not null default '{}'::jsonb,
  result jsonb,
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists systems_jobs_claim_idx
  on public.systems_jobs (type, status, created_at);

create index if not exists systems_jobs_account_idx
  on public.systems_jobs (account_id, created_at desc);

alter table public.systems_jobs enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'systems_jobs'
      and policyname = 'systems_jobs_service_role_all'
  ) then
    create policy systems_jobs_service_role_all
      on public.systems_jobs
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end
$$;

comment on table public.systems_jobs is
  'Async work for systems/ workers. Platform inserts pending rows; workers claim and complete them.';

-- Catalog product for the public API (table already exists on Kenoo Platform).
do $$
begin
  if to_regclass('public.platform_products') is null then
    return;
  end if;

  if exists (
    select 1 from public.platform_products where slug = 'people-enrichment'
  ) then
    update public.platform_products
    set
      name = 'People Enrichment',
      description = 'Research a person from a name or email. Returns a job you poll for a structured profile.',
      category = 'research',
      unit_amount_cents = 250,
      is_published = true,
      is_live = true,
      docs_path = '/docs/people-enrichment'
    where slug = 'people-enrichment';
    return;
  end if;

  insert into public.platform_products (
    slug,
    name,
    description,
    category,
    unit_amount_cents,
    is_published,
    is_live,
    docs_path
  )
  values (
    'people-enrichment',
    'People Enrichment',
    'Research a person from a name or email. Returns a job you poll for a structured profile.',
    'research',
    250,
    true,
    true,
    '/docs/people-enrichment'
  );
end
$$;
