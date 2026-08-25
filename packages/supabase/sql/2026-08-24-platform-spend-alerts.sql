-- Workspace spend-alert thresholds (percent of the monthly spend limit).

CREATE TABLE IF NOT EXISTS public.platform_spend_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  threshold_percent integer NOT NULL,
  CONSTRAINT platform_spend_alerts_percent_check
    CHECK (threshold_percent >= 1 AND threshold_percent <= 100),
  CONSTRAINT platform_spend_alerts_account_percent_key
    UNIQUE (account_id, threshold_percent)
);

CREATE INDEX IF NOT EXISTS platform_spend_alerts_account_idx
  ON public.platform_spend_alerts (account_id);

ALTER TABLE public.platform_spend_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_spend_alerts_select_member ON public.platform_spend_alerts;
CREATE POLICY platform_spend_alerts_select_member
  ON public.platform_spend_alerts
  FOR SELECT
  TO authenticated
  USING (public.platform_is_account_member(account_id));

GRANT SELECT ON public.platform_spend_alerts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_spend_alerts TO service_role;
