-- Seed Kenoo SaaS account_app_access from existing user_app_access onto each
-- user's personal account. Does NOT modify or delete user_app_access so
-- walls-app continues to work on the legacy path.
-- Admin stays user-level only (excluded from account grants).

INSERT INTO public.account_app_access (account_id, app_id)
SELECT
  a.id AS account_id,
  uaa.app_id
FROM public.user_app_access uaa
INNER JOIN public.accounts a
  ON a.personal_owner_id = uaa.user_id
 AND a.account_type = 'personal'
INNER JOIN public.apps app
  ON app.id = uaa.app_id
WHERE app.slug <> 'admin'
ON CONFLICT (account_id, app_id) DO NOTHING;

COMMENT ON TABLE public.account_app_access IS
  'Kenoo SaaS app grants scoped to an account (personal or organization). Legacy walls-app continues to use user_app_access until cutover.';
