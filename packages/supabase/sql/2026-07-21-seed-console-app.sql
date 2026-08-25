-- Seed the internal Kenoo Console app (super-admin).
-- Prefer packages/supabase/sql/2026-08-25-console-operators.sql which also
-- creates public.console_operators and seeds caleb@wallsentertainment.com.

INSERT INTO apps (slug, name, description, subdomain, is_active, icon_url)
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
