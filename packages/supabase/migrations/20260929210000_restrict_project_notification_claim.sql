revoke execute on function public.claim_project_notification_outbox(integer) from public, anon, authenticated;
grant execute on function public.claim_project_notification_outbox(integer) to service_role;
