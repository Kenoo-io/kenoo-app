-- Keep the Mail app's directory label and routing metadata aligned.
-- The slug remains `mail`; only the display name and canonical subdomain are updated.
update public.apps
set
  name = 'Mail',
  subdomain = 'mail',
  url_redirect = 'https://mail.kenoo.io',
  updated_at = now()
where slug = 'mail';
