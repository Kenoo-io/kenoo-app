-- GitHub retries reuse delivery IDs. Persist a receipt before applying any
-- state transition so duplicate deliveries are safe to acknowledge.
create table if not exists public.project_github_webhook_deliveries (
  delivery_id text primary key,
  event_name text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  payload_hash text not null
);

alter table public.project_github_webhook_deliveries enable row level security;
