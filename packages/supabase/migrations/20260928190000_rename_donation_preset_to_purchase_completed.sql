-- Make the successful transaction preset broadly useful beyond fundraising.
update public.flow_event_presets
set
  key = 'purchase_completed',
  name = 'Purchase completed',
  description = 'A customer successfully completes a purchase.',
  category = 'commerce',
  payload_schema = '{"purchase_id":"string","order_id":"string","customer_id":"string","email":"string","value":"number","currency":"string"}'::jsonb
where key = 'donation_created';
