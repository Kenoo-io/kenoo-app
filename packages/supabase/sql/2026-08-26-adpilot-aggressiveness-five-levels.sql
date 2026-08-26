-- Applied 2026-08-26 via Supabase MCP on project oehqusxpbwtbeenzixjh.
-- Aggressiveness is an integer 1–5 only. Values above 5 clamp to 5.
-- Every enabled / active AdPilot entity (and its preset) is set to 5.

COMMENT ON COLUMN public.ad_automation_profiles.settings IS
  'SpendAutomationSettings JSON. aggressiveness must be an integer 1–5.';

COMMENT ON COLUMN public.ad_entity_automation.settings_override IS
  'Partial SpendAutomationSettings JSON. aggressiveness, when present, must be an integer 1–5.';

UPDATE public.ad_automation_profiles
SET
  settings = jsonb_set(
    COALESCE(settings, '{}'::jsonb),
    '{aggressiveness}',
    to_jsonb(
      CASE
        WHEN jsonb_typeof(COALESCE(settings, '{}'::jsonb)->'aggressiveness') <> 'number' THEN 3
        WHEN (settings->>'aggressiveness')::numeric > 5 THEN 5
        WHEN (settings->>'aggressiveness')::numeric < 1 THEN 1
        ELSE GREATEST(1, LEAST(5, ROUND((settings->>'aggressiveness')::numeric)))::integer
      END
    )
  ),
  updated_at = now();

UPDATE public.ad_entity_automation
SET
  settings_override = jsonb_set(
    settings_override,
    '{aggressiveness}',
    to_jsonb(
      CASE
        WHEN jsonb_typeof(settings_override->'aggressiveness') <> 'number' THEN 5
        WHEN (settings_override->>'aggressiveness')::numeric > 5 THEN 5
        WHEN (settings_override->>'aggressiveness')::numeric < 1 THEN 1
        ELSE GREATEST(1, LEAST(5, ROUND((settings_override->>'aggressiveness')::numeric)))::integer
      END
    ),
    true
  ),
  updated_at = now()
WHERE settings_override ? 'aggressiveness';

UPDATE public.ad_entity_automation
SET
  settings_override = jsonb_set(
    COALESCE(settings_override, '{}'::jsonb),
    '{aggressiveness}',
    '5'::jsonb,
    true
  ),
  updated_at = now()
WHERE enabled = true
   OR automation_status IN ('active', 'learning', 'cooldown');

UPDATE public.ad_automation_profiles p
SET
  settings = jsonb_set(
    COALESCE(p.settings, '{}'::jsonb),
    '{aggressiveness}',
    '5'::jsonb
  ),
  updated_at = now()
WHERE EXISTS (
  SELECT 1
  FROM public.ad_entity_automation e
  WHERE e.profile_id = p.id
    AND (
      e.enabled = true
      OR e.automation_status IN ('active', 'learning', 'cooldown')
    )
);

ALTER TABLE public.ad_automation_profiles
  DROP CONSTRAINT IF EXISTS ad_automation_profiles_aggressiveness_level;

ALTER TABLE public.ad_automation_profiles
  ADD CONSTRAINT ad_automation_profiles_aggressiveness_level
  CHECK (
    jsonb_typeof(settings->'aggressiveness') = 'number'
    AND (settings->>'aggressiveness')::numeric IN (1, 2, 3, 4, 5)
  );

ALTER TABLE public.ad_entity_automation
  DROP CONSTRAINT IF EXISTS ad_entity_automation_aggressiveness_level;

ALTER TABLE public.ad_entity_automation
  ADD CONSTRAINT ad_entity_automation_aggressiveness_level
  CHECK (
    settings_override IS NULL
    OR NOT (settings_override ? 'aggressiveness')
    OR (
      jsonb_typeof(settings_override->'aggressiveness') = 'number'
      AND (settings_override->>'aggressiveness')::numeric IN (1, 2, 3, 4, 5)
    )
  );
