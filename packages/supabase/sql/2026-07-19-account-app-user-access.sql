-- Per-user app access within an account (personal or organization).
-- account_app_access = apps available to the account (catalog / entitlement).
-- account_app_user_access = which members of that account can use which apps.
-- For personal accounts these stay mirrored; for orgs they can differ.
-- Applied 2026-07-19 via Supabase MCP (oehqusxpbwtbeenzixjh).

CREATE TABLE IF NOT EXISTS public.account_app_user_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  app_id uuid NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  CONSTRAINT account_app_user_access_unique UNIQUE (account_id, user_id, app_id)
);

CREATE INDEX IF NOT EXISTS account_app_user_access_account_id_idx
  ON public.account_app_user_access (account_id);

CREATE INDEX IF NOT EXISTS account_app_user_access_user_id_idx
  ON public.account_app_user_access (user_id);

CREATE INDEX IF NOT EXISTS account_app_user_access_app_id_idx
  ON public.account_app_user_access (app_id);

CREATE INDEX IF NOT EXISTS account_app_user_access_account_user_idx
  ON public.account_app_user_access (account_id, user_id);

COMMENT ON TABLE public.account_app_user_access IS
  'Per-member app grants within an account. Kenoo SaaS gates on this for the active account. Personal accounts mirror account_app_access; org grants can differ per member.';

-- Seed from existing account_app_access so current behavior is preserved:
-- every account member gets every app currently enabled on that account.
INSERT INTO public.account_app_user_access (account_id, user_id, app_id)
SELECT
  aaa.account_id,
  au.user_id,
  aaa.app_id
FROM public.account_app_access aaa
INNER JOIN public.account_users au
  ON au.account_id = aaa.account_id
ON CONFLICT (account_id, user_id, app_id) DO NOTHING;
