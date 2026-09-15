-- Alert subscriptions are shared by every account-scoped application. Projects
-- uses the existing table with app_slug = 'projects' and
-- alert_key = 'projects.task_assigned', rather than maintaining an app-specific
-- notification-preferences table.

drop policy if exists alert_subscriptions_delete_member on public.alert_subscriptions;
drop policy if exists alert_subscriptions_insert_member on public.alert_subscriptions;
drop policy if exists alert_subscriptions_select_member on public.alert_subscriptions;
drop policy if exists alert_subscriptions_update_member on public.alert_subscriptions;

create policy alert_subscriptions_delete_account_member
  on public.alert_subscriptions for delete to authenticated
  using ((select public.is_account_member(account_id)));
create policy alert_subscriptions_insert_account_member
  on public.alert_subscriptions for insert to authenticated
  with check ((select public.is_account_member(account_id)));
create policy alert_subscriptions_select_account_member
  on public.alert_subscriptions for select to authenticated
  using ((select public.is_account_member(account_id)));
create policy alert_subscriptions_update_account_member
  on public.alert_subscriptions for update to authenticated
  using ((select public.is_account_member(account_id)))
  with check ((select public.is_account_member(account_id)));
