-- Applied 2026-08-26 via Supabase MCP on project oehqusxpbwtbeenzixjh.
-- Spend aggressiveness is now a discrete 1–5 strategy (not a 0–100 slider).
-- Values above 5 are remapped from the legacy 0–100 scale using the same
-- buckets as apps/adpilot/lib/spend-automation-settings.ts.

COMMENT ON COLUMN public.ad_automation_profiles.settings IS
  'SpendAutomationSettings JSON. aggressiveness is an integer 1–5 (extremely conservative → maximum growth).';

COMMENT ON COLUMN public.ad_entity_automation.settings_override IS
  'Partial SpendAutomationSettings JSON. aggressiveness, when present, is an integer 1–5.';

UPDATE public.ad_automation_profiles
SET
  settings = jsonb_set(
    COALESCE(settings, '{}'::jsonb),
    '{aggressiveness}',
    to_jsonb(
      CASE
        WHEN NULLIF(settings->>'aggressiveness', '') IS NULL THEN 3
        WHEN (settings->>'aggressiveness')::numeric > 5 THEN
          CASE
            WHEN (settings->>'aggressiveness')::numeric <= 16 THEN 1
            WHEN (settings->>'aggressiveness')::numeric <= 33 THEN 2
            WHEN (settings->>'aggressiveness')::numeric <= 66 THEN 3
            WHEN (settings->>'aggressiveness')::numeric <= 83 THEN 4
            ELSE 5
          END
        ELSE GREATEST(1, LEAST(5, ROUND((settings->>'aggressiveness')::numeric)))::integer
      END
    )
  ),
  updated_at = now()
WHERE COALESCE(settings, '{}'::jsonb) ? 'aggressiveness'
  AND (
    (settings->>'aggressiveness')::numeric > 5
    OR (settings->>'aggressiveness')::numeric < 1
    OR (settings->>'aggressiveness')::numeric
      <> ROUND((settings->>'aggressiveness')::numeric)
  );

UPDATE public.ad_entity_automation
SET
  settings_override = jsonb_set(
    settings_override,
    '{aggressiveness}',
    to_jsonb(
      CASE
        WHEN (settings_override->>'aggressiveness')::numeric > 5 THEN
          CASE
            WHEN (settings_override->>'aggressiveness')::numeric <= 16 THEN 1
            WHEN (settings_override->>'aggressiveness')::numeric <= 33 THEN 2
            WHEN (settings_override->>'aggressiveness')::numeric <= 66 THEN 3
            WHEN (settings_override->>'aggressiveness')::numeric <= 83 THEN 4
            ELSE 5
          END
        ELSE GREATEST(1, LEAST(5, ROUND((settings_override->>'aggressiveness')::numeric)))::integer
      END
    )
  ),
  updated_at = now()
WHERE settings_override ? 'aggressiveness'
  AND (
    (settings_override->>'aggressiveness')::numeric > 5
    OR (settings_override->>'aggressiveness')::numeric < 1
    OR (settings_override->>'aggressiveness')::numeric
      <> ROUND((settings_override->>'aggressiveness')::numeric)
  );
