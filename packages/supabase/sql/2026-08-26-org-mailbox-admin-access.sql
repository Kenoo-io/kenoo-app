-- Applied 2026-08-26 via Supabase MCP on project oehqusxpbwtbeenzixjh.
-- After 2026-08-24 RLS, email_threads and user_connections were owner-only.
-- Organization owners/admins (and WALLS platform admins for `team` rows) can
-- view teammate inboxes. OAuth tokens stay on user_connections (not this view).

CREATE OR REPLACE FUNCTION public.is_org_mailbox_admin_for_user(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    target_user_id IS NOT NULL
    AND auth.uid() IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM public.account_users mine
        JOIN public.accounts a ON a.id = mine.account_id
        JOIN public.account_users theirs ON theirs.account_id = mine.account_id
        WHERE mine.user_id = auth.uid()
          AND theirs.user_id = target_user_id
          AND a.account_type = 'organization'
          AND mine.role IN ('owner', 'admin')
      )
      OR (
        EXISTS (
          SELECT 1
          FROM public.users u
          WHERE u.id = auth.uid()
            AND u.is_admin = true
        )
        AND public.is_walls_org_member()
        AND EXISTS (
          SELECT 1
          FROM public.team t
          WHERE t.user_id = target_user_id
        )
      )
    );
$$;

COMMENT ON FUNCTION public.is_org_mailbox_admin_for_user(uuid) IS
  'True when the caller is an organization owner/admin sharing an org account with the target, or a WALLS platform admin viewing a team mailbox.';

REVOKE ALL ON FUNCTION public.is_org_mailbox_admin_for_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_org_mailbox_admin_for_user(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_email_thread_owner(p_thread_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.email_threads t
    WHERE t.id = p_thread_id
      AND (
        t.user_id = auth.uid()
        OR public.is_deal_member(t.deal_id)
        OR public.is_org_mailbox_admin_for_user(t.user_id)
      )
  );
$$;

DROP POLICY IF EXISTS email_threads_select_member ON public.email_threads;
DROP POLICY IF EXISTS email_threads_insert_member ON public.email_threads;
DROP POLICY IF EXISTS email_threads_update_member ON public.email_threads;
DROP POLICY IF EXISTS email_threads_delete_member ON public.email_threads;

CREATE POLICY email_threads_select_member ON public.email_threads
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_deal_member(deal_id)
    OR public.is_org_mailbox_admin_for_user(user_id)
  );

CREATE POLICY email_threads_insert_member ON public.email_threads
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_deal_member(deal_id)
    OR public.is_org_mailbox_admin_for_user(user_id)
  );

CREATE POLICY email_threads_update_member ON public.email_threads
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_deal_member(deal_id)
    OR public.is_org_mailbox_admin_for_user(user_id)
  )
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_deal_member(deal_id)
    OR public.is_org_mailbox_admin_for_user(user_id)
  );

CREATE POLICY email_threads_delete_member ON public.email_threads
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_deal_member(deal_id)
    OR public.is_org_mailbox_admin_for_user(user_id)
  );

CREATE OR REPLACE VIEW public.user_connection_presence AS
SELECT
  uc.user_id,
  uc.provider,
  uc.service,
  uc.revoked_at
FROM public.user_connections uc
WHERE uc.user_id = auth.uid()
   OR public.is_org_mailbox_admin_for_user(uc.user_id);

COMMENT ON VIEW public.user_connection_presence IS
  'Token-free connection presence so org mailbox admins can see whether teammates have Gmail without reading OAuth tokens.';

REVOKE ALL ON public.user_connection_presence FROM PUBLIC;
REVOKE ALL ON public.user_connection_presence FROM anon;
GRANT SELECT ON public.user_connection_presence TO authenticated;
