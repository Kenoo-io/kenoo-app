-- Register the Flows app so shared auth, account switching, and the launcher
-- can resolve it like the other Kenoo applications.
insert into public.apps (
  slug,
  name,
  description,
  is_active,
  url_redirect,
  subdomain
)
values (
  'flows',
  'Flows',
  'Customer journeys and email automations.',
  true,
  '/flows',
  'flows'
)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  is_active = true,
  url_redirect = excluded.url_redirect,
  subdomain = excluded.subdomain,
  updated_at = now();
