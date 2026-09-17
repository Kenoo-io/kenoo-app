-- Reuse the existing user notification inbox as the idempotent record for
-- transactional delivery. PostgreSQL permits multiple NULL values in a unique
-- constraint, so legacy notifications remain unaffected.
alter table public.user_notifications
  add column if not exists dedupe_key text;

alter table public.user_notifications
  drop constraint if exists user_notifications_dedupe_key_key;

alter table public.user_notifications
  add constraint user_notifications_dedupe_key_key unique (dedupe_key);
