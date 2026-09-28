alter table public.platform_api_keys
  add column if not exists scopes text[] not null default array['platform:*']::text[];

create index if not exists platform_api_keys_scopes_idx
  on public.platform_api_keys using gin (scopes);
