-- Phase 1: SaaS CRM tenancy prep (walls-app safe).
-- Adds nullable account_id to CRM core tables and backfills existing
-- WALLS agency data to the walls-entertainment organization account.
-- Does NOT enable RLS or change uniqueness yet (would break walls-app / Apollo sync).
-- Applied 2026-07-27 via Supabase MCP (oehqusxpbwtbeenzixjh).

-- Generic membership helper (same pattern as is_ad_account_member / is_project_account_member).
CREATE OR REPLACE FUNCTION public.is_account_member(target_account_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.account_users au
    WHERE au.account_id = target_account_id
      AND au.user_id = auth.uid()
  );
$$;

COMMENT ON FUNCTION public.is_account_member(uuid) IS
  'True when auth.uid() is a member of the given accounts.id. Used for CRM/AdPilot/Projects RLS.';

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE;

ALTER TABLE public.people
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE;

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE;

ALTER TABLE public.sequences
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE;

ALTER TABLE public.pitches
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE;

ALTER TABLE public.deal_stages
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS companies_account_id_idx ON public.companies (account_id);
CREATE INDEX IF NOT EXISTS people_account_id_idx ON public.people (account_id);
CREATE INDEX IF NOT EXISTS deals_account_id_idx ON public.deals (account_id);
CREATE INDEX IF NOT EXISTS sequences_account_id_idx ON public.sequences (account_id);
CREATE INDEX IF NOT EXISTS pitches_account_id_idx ON public.pitches (account_id);
CREATE INDEX IF NOT EXISTS deal_stages_account_id_idx ON public.deal_stages (account_id);

COMMENT ON COLUMN public.companies.account_id IS
  'Kenoo SaaS tenant (accounts.id). Phase 1: nullable; existing rows backfilled to WALLS. RLS deferred until kenoo CRM + walls-app filter on this.';
COMMENT ON COLUMN public.people.account_id IS
  'Kenoo SaaS tenant (accounts.id). Phase 1 nullable; backfilled to WALLS.';
COMMENT ON COLUMN public.deals.account_id IS
  'Kenoo SaaS tenant (accounts.id). Phase 1 nullable; backfilled to WALLS.';
COMMENT ON COLUMN public.sequences.account_id IS
  'Kenoo SaaS tenant (accounts.id). Phase 1 nullable; backfilled to WALLS.';
COMMENT ON COLUMN public.pitches.account_id IS
  'Kenoo SaaS tenant (accounts.id). Phase 1 nullable; backfilled to WALLS.';
COMMENT ON COLUMN public.deal_stages.account_id IS
  'Kenoo SaaS tenant (accounts.id). Phase 1 nullable; backfilled to WALLS.';

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
