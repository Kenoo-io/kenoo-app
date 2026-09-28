-- Common subscription lifecycle events for recurring billing workflows.
insert into public.flow_event_presets (key, name, description, category, payload_schema)
values
  ('subscription_created', 'Subscription created', 'A customer starts a new subscription.', 'subscription', '{"subscription_id":"string","customer_id":"string","email":"string","plan_id":"string","value":"number","currency":"string","interval":"string"}'::jsonb),
  ('subscription_renewed', 'Subscription renewed', 'A recurring subscription successfully renews for another billing period.', 'subscription', '{"subscription_id":"string","customer_id":"string","email":"string","plan_id":"string","value":"number","currency":"string","period_start":"string","period_end":"string"}'::jsonb),
  ('subscription_canceled', 'Subscription canceled', 'A customer subscription is canceled and will not renew.', 'subscription', '{"subscription_id":"string","customer_id":"string","email":"string","plan_id":"string","cancel_at":"string","reason":"string"}'::jsonb),
  ('subscription_paused', 'Subscription paused', 'A customer subscription is paused temporarily.', 'subscription', '{"subscription_id":"string","customer_id":"string","email":"string","plan_id":"string","resume_at":"string","reason":"string"}'::jsonb)
on conflict (key) do nothing;
