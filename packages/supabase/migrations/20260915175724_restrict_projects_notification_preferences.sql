drop policy if exists alert_subscriptions_delete_account_member on public.alert_subscriptions;
drop policy if exists alert_subscriptions_insert_account_member on public.alert_subscriptions;
drop policy if exists alert_subscriptions_select_account_member on public.alert_subscriptions;
drop policy if exists alert_subscriptions_update_account_member on public.alert_subscriptions;

-- Projects preferences are personal. Other alert subscriptions retain
-- account-member management for shared operational alerts such as AdPilot.
create policy alert_subscriptions_delete_scoped
  on public.alert_subscriptions for delete to authenticated
  using (
    (app_slug = 'projects' and user_id = (select auth.uid()))
    or (app_slug <> 'projects' and (select public.is_account_member(account_id)))
  );
create policy alert_subscriptions_insert_scoped
  on public.alert_subscriptions for insert to authenticated
  with check (
    (app_slug = 'projects' and user_id = (select auth.uid()) and (select public.is_account_member(account_id)))
    or (app_slug <> 'projects' and (select public.is_account_member(account_id)))
  );
create policy alert_subscriptions_select_scoped
  on public.alert_subscriptions for select to authenticated
  using (
    (app_slug = 'projects' and user_id = (select auth.uid()))
    or (app_slug <> 'projects' and (select public.is_account_member(account_id)))
  );
create policy alert_subscriptions_update_scoped
  on public.alert_subscriptions for update to authenticated
  using (
    (app_slug = 'projects' and user_id = (select auth.uid()))
    or (app_slug <> 'projects' and (select public.is_account_member(account_id)))
  )
  with check (
    (app_slug = 'projects' and user_id = (select auth.uid()) and (select public.is_account_member(account_id)))
    or (app_slug <> 'projects' and (select public.is_account_member(account_id)))
  );
