create or replace function public.dispatch_project_notification_outbox()
returns trigger
language plpgsql
security definer
set search_path = public, vault
as $$
begin
  perform net.http_post(
    url := 'https://projects.kenoo.io/api/internal/process-project-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'project_notification_worker_secret'
        limit 1
      )
    ),
    body := jsonb_build_object('outbox_id', new.id),
    timeout_milliseconds := 5000
  );
  return new;
end;
$$;

revoke all on function public.dispatch_project_notification_outbox() from public;
grant execute on function public.dispatch_project_notification_outbox() to authenticated, service_role;

drop trigger if exists trg_project_notification_outbox_dispatch on public.project_notification_outbox;
create trigger trg_project_notification_outbox_dispatch
after insert on public.project_notification_outbox
for each row execute function public.dispatch_project_notification_outbox();
