-- Kenoo SMS / A2P 10DLC consent state on users + auditable event log.
-- Applied 2026-08-07 via Supabase MCP (oehqusxpbwtbeenzixjh).
-- Phone storage (users.phone_number) remains separate from SMS consent.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS sms_notifications_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_consent_granted_at timestamptz,
  ADD COLUMN IF NOT EXISTS sms_consent_withdrawn_at timestamptz,
  ADD COLUMN IF NOT EXISTS sms_consent_phone text,
  ADD COLUMN IF NOT EXISTS sms_consent_version text,
  ADD COLUMN IF NOT EXISTS sms_consent_source text;

COMMENT ON COLUMN public.users.sms_notifications_enabled IS
  'Whether the user has opted in to Kenoo transactional/operational SMS. Default false; never infer from phone_number alone.';
COMMENT ON COLUMN public.users.sms_consent_granted_at IS
  'Timestamp of the most recent SMS opt-in.';
COMMENT ON COLUMN public.users.sms_consent_withdrawn_at IS
  'Timestamp of the most recent SMS opt-out (settings or STOP), if any.';
COMMENT ON COLUMN public.users.sms_consent_phone IS
  'Phone number captured at the time of the most recent SMS opt-in.';
COMMENT ON COLUMN public.users.sms_consent_version IS
  'Disclosure/consent copy version accepted at opt-in (e.g. kenoo-sms-v1).';
COMMENT ON COLUMN public.users.sms_consent_source IS
  'How consent was last changed: web_settings | sms_stop | sms_help | admin.';

CREATE TABLE IF NOT EXISTS public.sms_consent_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  phone_number text,
  action text NOT NULL,
  consent_version text,
  source text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT sms_consent_events_action_check
    CHECK (action IN ('opt_in', 'opt_out', 'phone_changed')),
  CONSTRAINT sms_consent_events_source_check
    CHECK (source IN ('web_settings', 'sms_stop', 'sms_help', 'admin', 'system'))
);

CREATE INDEX IF NOT EXISTS sms_consent_events_user_id_created_at_idx
  ON public.sms_consent_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS users_sms_notifications_enabled_idx
  ON public.users (sms_notifications_enabled)
  WHERE sms_notifications_enabled = true;

COMMENT ON TABLE public.sms_consent_events IS
  'Append-only audit log of Kenoo SMS notification consent grants and withdrawals.';

ALTER TABLE public.sms_consent_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sms_consent_events_select_own ON public.sms_consent_events;
CREATE POLICY sms_consent_events_select_own
  ON public.sms_consent_events
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS sms_consent_events_insert_own ON public.sms_consent_events;
CREATE POLICY sms_consent_events_insert_own
  ON public.sms_consent_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- No UPDATE/DELETE policies for authenticated: events are append-only.
-- Service role bypasses RLS for Twilio STOP/HELP webhook sync.
