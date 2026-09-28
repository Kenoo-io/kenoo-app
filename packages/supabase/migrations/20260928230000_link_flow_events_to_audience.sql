-- Link identifiable event occurrences to the Flow-owned audience record.
-- Anonymous occurrences remain valid with a null audience_id.
alter table public.flow_event_occurrences
  add column audience_id uuid references public.flow_audience(id) on delete set null;

create index flow_event_occurrences_account_audience_idx
  on public.flow_event_occurrences(account_id, audience_id, occurred_at desc)
  where audience_id is not null;
