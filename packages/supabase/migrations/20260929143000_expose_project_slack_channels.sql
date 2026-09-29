-- The Projects server uses the service-role client for Slack credentials and
-- channel configuration. Keep the table RLS-protected while allowing that
-- server-only client to reach it through the Supabase Data API.
grant usage on schema public to service_role;
grant select, insert, update, delete on table public.project_slack_channels to service_role;

notify pgrst, 'reload schema';
