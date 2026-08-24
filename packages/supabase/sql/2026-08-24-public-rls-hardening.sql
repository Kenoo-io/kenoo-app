-- Applied 2026-08-24 via Supabase MCP on project oehqusxpbwtbeenzixjh (Kenoo).
-- All public tables now have RLS enabled (203/203).
--
-- Access model:
--   Kenoo tenant tables with account_id -> is_account_member(account_id)
--   CRM children -> is_company_member / is_deal_member / is_person_member / is_sequence_member / is_pitch_member
--   WALLS-only tables without account_id -> is_walls_org_member() (accounts.slug = walls-entertainment)
--   User-owned rows -> user_id = auth.uid()
--   Marketplace storefront -> public SELECT of active catalogs; writes for owner_user_id or WALLS staff
--   jobs, stripe_webhook_events, analytics_events -> RLS on, no client policies (service_role only)
--
-- Anon Data API is revoked except careers, contact form, newsletter, platform products, and storefront reads/inserts.
-- Service role bypasses RLS (Apollo sync, webhooks, @walls/supabase/admin).
--
-- BREAKING: kenoo CRM and walls-app paths that used a session-less anon client will get empty results.
-- Those paths must use a cookie/session client or the service-role admin client.

CREATE OR REPLACE FUNCTION public.is_walls_org_member()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.account_users au
    JOIN public.accounts a ON a.id = au.account_id
    WHERE a.slug = 'walls-entertainment'
      AND au.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_company_member(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = p_company_id
      AND public.is_account_member(c.account_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_deal_member(p_deal_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.deals d
    WHERE d.id = p_deal_id
      AND public.is_account_member(d.account_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_person_member(p_person_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.people p
    WHERE p.id = p_person_id
      AND public.is_account_member(p.account_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_sequence_member(p_sequence_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sequences s
    WHERE s.id = p_sequence_id
      AND public.is_account_member(s.account_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_pitch_member(p_pitch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.pitches p
    WHERE p.id = p_pitch_id
      AND public.is_account_member(p.account_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_marketplace_owner(p_marketplace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.marketplaces m
    WHERE m.id = p_marketplace_id
      AND (
        m.owner_user_id = auth.uid()
        OR public.is_walls_org_member()
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_invoice_member(p_invoice_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.invoices i
    WHERE i.id = p_invoice_id
      AND (
        public.is_deal_member(i.deal_id)
        OR public.is_company_member(i.company_id)
      )
  );
$$;

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
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_user_connection_owner(p_connection_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_connections uc
    WHERE uc.id = p_connection_id
      AND uc.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_calendar_event_owner(p_event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.calendar_events e
    WHERE e.id = p_event_id
      AND e.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_sequence_people_member(p_sequence_people_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sequence_people sp
    WHERE sp.id = p_sequence_people_id
      AND public.is_sequence_member(sp.sequence_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_sequence_step_join_member(p_join_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sequence_steps_join j
    WHERE j.id = p_join_id
      AND public.is_sequence_member(j.sequence_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_talent_list_owner(p_list_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.talent_list l
    WHERE l.id = p_list_id
      AND (
        l.list_owner = auth.uid()
        OR public.is_walls_org_member()
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_marketplace_order_owner(p_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.marketplace_orders o
    WHERE o.id = p_order_id
      AND public.is_marketplace_owner(o.marketplace_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_marketplace_product_owner(p_product_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.marketplace_products p
    WHERE p.id = p_product_id
      AND public.is_marketplace_owner(p.marketplace_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_marketplace_email_domain_owner(p_domain_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.marketplace_email_domains d
    WHERE d.id = p_domain_id
      AND public.is_marketplace_owner(d.marketplace_id)
  );
$$;

REVOKE ALL ON FUNCTION public.is_walls_org_member() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_company_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_deal_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_person_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_sequence_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_pitch_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_marketplace_owner(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_invoice_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_email_thread_owner(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_user_connection_owner(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_calendar_event_owner(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_sequence_people_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_sequence_step_join_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_talent_list_owner(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_marketplace_order_owner(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_marketplace_product_owner(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_marketplace_email_domain_owner(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_account_member(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_walls_org_member() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_company_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_deal_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_person_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_sequence_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_pitch_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_marketplace_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_invoice_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_email_thread_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_connection_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_calendar_event_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_sequence_people_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_sequence_step_join_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_talent_list_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_marketplace_order_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_marketplace_product_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_marketplace_email_domain_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_account_member(uuid) TO authenticated;

CREATE OR REPLACE PROCEDURE public.apply_authenticated_crud_policy(p_table text, p_using text)
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', p_table);
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p_table || '_select_member', p_table);
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p_table || '_insert_member', p_table);
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p_table || '_update_member', p_table);
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p_table || '_delete_member', p_table);
  EXECUTE format(
    'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (%s)',
    p_table || '_select_member', p_table, p_using
  );
  EXECUTE format(
    'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (%s)',
    p_table || '_insert_member', p_table, p_using
  );
  EXECUTE format(
    'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)',
    p_table || '_update_member', p_table, p_using, p_using
  );
  EXECUTE format(
    'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (%s)',
    p_table || '_delete_member', p_table, p_using
  );
END;
$$;

CREATE OR REPLACE PROCEDURE public.drop_public_policies(VARIADIC p_tables text[])
LANGUAGE plpgsql
AS $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY (p_tables)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END;
$$;
