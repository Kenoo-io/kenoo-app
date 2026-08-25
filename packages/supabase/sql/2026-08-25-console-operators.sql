-- Super-admin allowlist for console.kenoo.io.
-- Access is NOT users.is_admin. Only rows in console_operators may open Console.
-- Applied 2026-08-25 via Supabase MCP on project oehqusxpbwtbeenzixjh (Kenoo).

INSERT INTO public.apps (slug, name, description, subdomain, is_active, icon_url)
VALUES (
  'console',
  'Console',
  'Internal Kenoo super-admin — system-wide users, apps, jobs, and teams.',
  'console',
  true,
  'https://assets.wallsentertainment.com/logo-variations/black-logo.png'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subdomain = EXCLUDED.subdomain,
  is_active = EXCLUDED.is_active;

CREATE TABLE IF NOT EXISTS public.console_operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  CONSTRAINT console_operators_email_key UNIQUE (email),
  CONSTRAINT console_operators_email_lower_check CHECK (email = lower(email))
);

CREATE INDEX IF NOT EXISTS console_operators_user_id_idx
  ON public.console_operators (user_id)
  WHERE user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.is_console_operator()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.console_operators o
    WHERE o.user_id = auth.uid()
       OR o.email = lower(
         COALESCE(
           (SELECT u.email FROM public.users u WHERE u.id = auth.uid()),
           (SELECT au.email FROM auth.users au WHERE au.id = auth.uid())
         )
       )
  );
$$;

REVOKE ALL ON FUNCTION public.is_console_operator() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_console_operator() TO authenticated;

ALTER TABLE public.console_operators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS console_operators_select_operator ON public.console_operators;
CREATE POLICY console_operators_select_operator
  ON public.console_operators
  FOR SELECT
  TO authenticated
  USING (public.is_console_operator());

REVOKE ALL ON TABLE public.console_operators FROM PUBLIC;
REVOKE ALL ON TABLE public.console_operators FROM anon;
GRANT SELECT ON TABLE public.console_operators TO authenticated;

INSERT INTO public.console_operators (email)
VALUES ('caleb@wallsentertainment.com')
ON CONFLICT (email) DO NOTHING;

UPDATE public.console_operators o
SET user_id = u.id
FROM public.users u
WHERE o.email = lower(u.email)
  AND o.user_id IS DISTINCT FROM u.id;
