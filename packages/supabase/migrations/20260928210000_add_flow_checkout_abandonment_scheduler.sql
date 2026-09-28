-- Derive checkout_abandoned occurrences after 60 minutes without a successful checkout.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated, service_role;

create or replace function private.emit_flow_checkout_abandoned_events()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
set lock_timeout = '2s'
as $$
declare
  inserted_count integer := 0;
begin
  insert into public.flow_event_occurrences (
    account_id,
    event_id,
    event_key,
    api_key_id,
    external_id,
    idempotency_key,
    payload,
    context,
    occurred_at
  )
  select
    started.account_id,
    abandoned_definition.id,
    abandoned_definition.key,
    null,
    checkout_identity,
    'system:checkout_abandoned:' || started.id::text,
    coalesce(started.payload, '{}'::jsonb) || jsonb_build_object(
      'checkout_id', checkout_identity,
      'abandonment_after_minutes', 60,
      'abandonment_reason', 'no_successful_checkout_after_60_minutes'
    ),
    jsonb_build_object(
      'source', 'system',
      'derived_from_occurrence_id', started.id,
      'derived_from_event_key', started.event_key
    ),
    clock_timestamp()
  from public.flow_event_occurrences started
  join public.flow_events abandoned_definition
    on abandoned_definition.account_id = started.account_id
   and abandoned_definition.key = 'checkout_abandoned'
   and abandoned_definition.is_active
  cross join lateral (
    select coalesce(
      nullif(started.payload->>'checkout_id', ''),
      nullif(started.external_id, '')
    ) as checkout_identity
  ) identity
  where started.event_key = 'checkout_started'
    and started.occurred_at <= clock_timestamp() - interval '60 minutes'
    and checkout_identity is not null
    and not exists (
      select 1
      from public.flow_event_occurrences completed
      where completed.account_id = started.account_id
        and completed.event_key in (
          'checkout_completed',
          'purchase_completed',
          'donation_completed',
          'subscription_created'
        )
        and coalesce(
          nullif(completed.payload->>'checkout_id', ''),
          nullif(completed.external_id, '')
        ) = checkout_identity
    )
    and not exists (
      select 1
      from public.flow_event_occurrences abandoned
      where abandoned.account_id = started.account_id
        and abandoned.idempotency_key = 'system:checkout_abandoned:' || started.id::text
    )
  on conflict (account_id, idempotency_key) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

comment on function private.emit_flow_checkout_abandoned_events() is
  'Every-five-minute idempotent derivation of checkout_abandoned from checkout_started occurrences at least 60 minutes old without a matching successful checkout event.';

revoke all on function private.emit_flow_checkout_abandoned_events()
  from public, anon, authenticated, service_role;

do $registration$
declare
  existing record;
  job_name constant text := 'emit-flow-checkout-abandoned-events';
  job_schedule constant text := '*/5 * * * *';
  job_command constant text := 'select private.emit_flow_checkout_abandoned_events();';
begin
  if to_regprocedure('cron.schedule(text,text,text)') is null then
    raise exception 'Checkout abandonment scheduler requires pg_cron';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('flow-checkout-abandoned-schedule-registration', 0));
  if (select count(*) from cron.job where jobname = job_name) > 1 then
    raise exception 'Duplicate Flow checkout abandonment jobs require explicit reconciliation';
  end if;

  select * into existing from cron.job where jobname = job_name;
  if found then
    if existing.schedule is distinct from job_schedule
      or existing.command is distinct from job_command
      or existing.database is distinct from current_database()
      or existing.active is distinct from true then
      raise exception 'Existing Flow checkout abandonment job differs; refusing to overwrite it';
    end if;
  else
    perform cron.schedule(job_name, job_schedule, job_command);
  end if;
end;
$registration$;
