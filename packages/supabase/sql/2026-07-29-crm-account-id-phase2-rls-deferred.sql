-- DEFERRED — do NOT apply until walls-app + kenoo Apollo sync use session or
-- service-role clients for CRM tables. Enabling this today breaks ~34 walls-app
-- files and several kenoo CRM paths that talk as the anon role (auth.uid() null).
--
-- When ready:
--   1. Replace plain createClient(url, anonKey) with SSR/session clients
--   2. Move Apollo *-supabase-sync routes to @walls/supabase/admin
--   3. Confirm every walls-app user has account_users for walls-entertainment
--   4. Apply this file
--   5. Mirror .eq('account_id', walls-entertainment) filters into walls-app lists

-- DROP POLICY IF EXISTS "Enable read access for all users" ON public.companies;

-- ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.sequences ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.pitches ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.deal_stages ENABLE ROW LEVEL SECURITY;

-- Example policy block (repeat per table), copying AdPilot:
-- DROP POLICY IF EXISTS companies_select_member ON public.companies;
-- CREATE POLICY companies_select_member
--   ON public.companies FOR SELECT TO authenticated
--   USING (is_account_member(account_id));
-- ... insert / update / delete with WITH CHECK / USING is_account_member(account_id)
