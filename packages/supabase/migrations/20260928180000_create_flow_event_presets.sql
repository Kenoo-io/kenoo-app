-- Global event definitions that can be copied into an account's Flows setup.
create table public.flow_event_presets (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z][a-z0-9_]*$'),
  name text not null,
  description text not null,
  category text not null default 'general',
  payload_schema jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.flow_event_presets enable row level security;

grant select on public.flow_event_presets to authenticated;

create policy flow_event_presets_select_active
  on public.flow_event_presets for select to authenticated
  using (is_active);

insert into public.flow_event_presets (key, name, description, category, payload_schema)
values
  ('checkout_started', 'Checkout started', 'A customer begins a checkout but has not completed payment.', 'commerce', '{"checkout_id":"string","customer_id":"string","email":"string","cart_value":"number","currency":"string"}'::jsonb),
  ('checkout_completed', 'Checkout completed', 'A customer successfully completes a checkout.', 'commerce', '{"checkout_id":"string","customer_id":"string","order_id":"string","email":"string","value":"number","currency":"string"}'::jsonb),
  ('checkout_abandoned', 'Checkout abandoned', 'A checkout remains incomplete after the configured abandonment window.', 'commerce', '{"checkout_id":"string","customer_id":"string","email":"string","cart_value":"number","currency":"string","abandonment_window_minutes":"number"}'::jsonb),
  ('cart_updated', 'Cart updated', 'A customer adds, removes, or changes items in their cart.', 'commerce', '{"cart_id":"string","customer_id":"string","cart_value":"number","currency":"string","items":"array"}'::jsonb),
  ('donation_created', 'Donation created', 'A donation is successfully created or processed.', 'fundraising', '{"donation_id":"string","donor_id":"string","email":"string","amount":"number","currency":"string","campaign_id":"string"}'::jsonb),
  ('profile_created', 'Profile created', 'A new customer or constituent profile is created.', 'profile', '{"profile_id":"string","email":"string","first_name":"string","last_name":"string"}'::jsonb),
  ('profile_updated', 'Profile updated', 'A customer or constituent profile is updated.', 'profile', '{"profile_id":"string","email":"string","changed_fields":"array"}'::jsonb),
  ('email_subscribed', 'Email subscribed', 'A person opts into email communications.', 'engagement', '{"profile_id":"string","email":"string","list_id":"string"}'::jsonb),
  ('email_unsubscribed', 'Email unsubscribed', 'A person opts out of email communications.', 'engagement', '{"profile_id":"string","email":"string","list_id":"string"}'::jsonb),
  ('payment_failed', 'Payment failed', 'A payment attempt fails or is declined.', 'commerce', '{"payment_id":"string","customer_id":"string","email":"string","amount":"number","currency":"string","reason":"string"}'::jsonb)
on conflict (key) do nothing;
