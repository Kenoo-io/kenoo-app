-- Phase 2: CRM tenancy — app filters + walls-app-safe defaults.
--
-- What this does:
--   1. Re-backfills any NULL account_id rows to walls-entertainment
--   2. Adds BEFORE INSERT triggers so walls-app / Apollo inserts that omit
--      account_id still land on the WALLS org account (same Supabase project)
--
-- What this deliberately does NOT do:
--   - Enable RLS on people/companies/deals/sequences/pitches/deal_stages
--   - Drop the legacy "Enable read access for all users" policy on companies
--
-- Why: walls-app (separate repo) and several kenoo CRM paths still use a plain
-- @supabase/supabase-js anon client with no cookie session. Enabling RLS on
-- is_account_member(account_id) would lock those paths out (auth.uid() is null).
-- Kenoo CRM Phase 2 scopes at the app layer (.eq('account_id', activeAccountId)).
-- Enable RLS only after walls-app + kenoo Apollo sync use session or service-role
-- clients — see 2026-07-29-crm-account-id-phase2-rls-deferred.sql.

-- ---------------------------------------------------------------------------
-- 1. Re-backfill NULLs (safety net for rows created after phase 1)
-- ---------------------------------------------------------------------------
UPDATE public.companies c
SET account_id = a.id
FROM public.accounts a
WHERE a.slug = 'walls-entertainment'
  AND c.account_id IS NULL;

UPDATE public.people p
SET account_id = a.id
FROM public.accounts a
WHERE a.slug = 'walls-entertainment'
  AND p.account_id IS NULL;

UPDATE public.deals d
SET account_id = a.id
FROM public.accounts a
WHERE a.slug = 'walls-entertainment'
  AND d.account_id IS NULL;

UPDATE public.sequences s
SET account_id = a.id
FROM public.accounts a
WHERE a.slug = 'walls-entertainment'
  AND s.account_id IS NULL;

UPDATE public.pitches p
SET account_id = a.id
FROM public.accounts a
WHERE a.slug = 'walls-entertainment'
  AND p.account_id IS NULL;

UPDATE public.deal_stages ds
SET account_id = a.id
FROM public.accounts a
WHERE a.slug = 'walls-entertainment'
  AND ds.account_id IS NULL;

-- ---------------------------------------------------------------------------
-- 2. Default account_id on INSERT when omitted (walls-app compatible)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.crm_default_account_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.account_id IS NULL THEN
    SELECT id INTO NEW.account_id
    FROM public.accounts
    WHERE slug = 'walls-entertainment'
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.crm_default_account_id() IS
  'Phase 2: when CRM rows are inserted without account_id (walls-app / legacy Apollo), stamp walls-entertainment so Kenoo account filters stay correct.';

DROP TRIGGER IF EXISTS companies_default_account_id ON public.companies;
CREATE TRIGGER companies_default_account_id
  BEFORE INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.crm_default_account_id();

DROP TRIGGER IF EXISTS people_default_account_id ON public.people;
CREATE TRIGGER people_default_account_id
  BEFORE INSERT ON public.people
  FOR EACH ROW
  EXECUTE FUNCTION public.crm_default_account_id();

DROP TRIGGER IF EXISTS deals_default_account_id ON public.deals;
CREATE TRIGGER deals_default_account_id
  BEFORE INSERT ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.crm_default_account_id();

DROP TRIGGER IF EXISTS sequences_default_account_id ON public.sequences;
CREATE TRIGGER sequences_default_account_id
  BEFORE INSERT ON public.sequences
  FOR EACH ROW
  EXECUTE FUNCTION public.crm_default_account_id();

DROP TRIGGER IF EXISTS pitches_default_account_id ON public.pitches;
CREATE TRIGGER pitches_default_account_id
  BEFORE INSERT ON public.pitches
  FOR EACH ROW
  EXECUTE FUNCTION public.crm_default_account_id();

DROP TRIGGER IF EXISTS deal_stages_default_account_id ON public.deal_stages;
CREATE TRIGGER deal_stages_default_account_id
  BEFORE INSERT ON public.deal_stages
  FOR EACH ROW
  EXECUTE FUNCTION public.crm_default_account_id();
