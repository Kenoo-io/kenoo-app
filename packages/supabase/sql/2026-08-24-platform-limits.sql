-- Workspace monthly spend limits, product allow/block, and per-product request caps.

ALTER TABLE public.platform_wallets
  ADD COLUMN IF NOT EXISTS monthly_spend_limit_cents integer;

ALTER TABLE public.platform_wallets
  DROP CONSTRAINT IF EXISTS platform_wallets_monthly_spend_limit_check;

ALTER TABLE public.platform_wallets
  ADD CONSTRAINT platform_wallets_monthly_spend_limit_check
  CHECK (
    monthly_spend_limit_cents IS NULL
    OR monthly_spend_limit_cents >= 100
  );

CREATE TABLE IF NOT EXISTS public.platform_product_limits (
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.platform_products(id) ON DELETE CASCADE,
  blocked boolean NOT NULL DEFAULT false,
  monthly_request_limit integer,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, product_id),
  CONSTRAINT platform_product_limits_request_limit_check
    CHECK (monthly_request_limit IS NULL OR monthly_request_limit >= 1)
);

CREATE INDEX IF NOT EXISTS platform_product_limits_account_idx
  ON public.platform_product_limits (account_id);

CREATE INDEX IF NOT EXISTS platform_usage_events_account_product_created_idx
  ON public.platform_usage_events (account_id, product_id, created_at DESC);

ALTER TABLE public.platform_product_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_product_limits_select_member ON public.platform_product_limits;
CREATE POLICY platform_product_limits_select_member
  ON public.platform_product_limits
  FOR SELECT
  TO authenticated
  USING (public.platform_is_account_member(account_id));

GRANT SELECT ON public.platform_product_limits TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_product_limits TO service_role;

DROP FUNCTION IF EXISTS public.platform_consume_credits(uuid, integer, uuid, uuid, text, integer, jsonb);

CREATE OR REPLACE FUNCTION public.platform_consume_credits(
  p_account_id uuid,
  p_amount_cents integer,
  p_api_key_id uuid,
  p_product_id uuid,
  p_request_id text,
  p_units integer DEFAULT 1,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(ok boolean, balance_cents bigint, usage_event_id uuid, reason text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance bigint;
  v_event_id uuid;
  v_limit integer;
  v_spent bigint;
  v_blocked boolean;
  v_request_limit integer;
  v_request_count integer;
  v_month_start timestamptz;
BEGIN
  IF p_amount_cents < 0 THEN
    RAISE EXCEPTION 'amount must be non-negative';
  END IF;

  v_month_start := date_trunc('month', timezone('utc', now()));

  IF p_request_id IS NOT NULL THEN
    SELECT pue.id, pw.balance_cents
      INTO v_event_id, v_balance
    FROM public.platform_usage_events pue
    JOIN public.platform_wallets pw ON pw.account_id = pue.account_id
    WHERE pue.request_id = p_request_id
    LIMIT 1;

    IF v_event_id IS NOT NULL THEN
      RETURN QUERY SELECT true, COALESCE(v_balance, 0), v_event_id, NULL::text;
      RETURN;
    END IF;
  END IF;

  PERFORM public.platform_ensure_wallet(p_account_id);

  SELECT COALESCE(ppl.blocked, false), ppl.monthly_request_limit
    INTO v_blocked, v_request_limit
  FROM public.platform_product_limits ppl
  WHERE ppl.account_id = p_account_id
    AND ppl.product_id = p_product_id;

  IF COALESCE(v_blocked, false) THEN
    SELECT pw.balance_cents INTO v_balance
    FROM public.platform_wallets pw
    WHERE pw.account_id = p_account_id;
    RETURN QUERY SELECT false, COALESCE(v_balance, 0), NULL::uuid, 'product_blocked';
    RETURN;
  END IF;

  SELECT pw.balance_cents, pw.monthly_spend_limit_cents
    INTO v_balance, v_limit
  FROM public.platform_wallets pw
  WHERE pw.account_id = p_account_id
  FOR UPDATE;

  IF v_request_limit IS NOT NULL THEN
    SELECT COUNT(*)::integer
      INTO v_request_count
    FROM public.platform_usage_events pue
    WHERE pue.account_id = p_account_id
      AND pue.product_id = p_product_id
      AND pue.status = 'success'
      AND pue.created_at >= v_month_start;

    IF COALESCE(v_request_count, 0) >= v_request_limit THEN
      RETURN QUERY SELECT false, v_balance, NULL::uuid, 'rate_limit';
      RETURN;
    END IF;
  END IF;

  IF v_limit IS NOT NULL THEN
    SELECT COALESCE(SUM(pue.amount_cents), 0)
      INTO v_spent
    FROM public.platform_usage_events pue
    WHERE pue.account_id = p_account_id
      AND pue.status = 'success'
      AND pue.created_at >= v_month_start;

    IF COALESCE(v_spent, 0) + p_amount_cents > v_limit THEN
      RETURN QUERY SELECT false, v_balance, NULL::uuid, 'spend_limit';
      RETURN;
    END IF;
  END IF;

  IF v_balance < p_amount_cents THEN
    RETURN QUERY SELECT false, v_balance, NULL::uuid, 'insufficient_funds';
    RETURN;
  END IF;

  UPDATE public.platform_wallets
  SET
    balance_cents = balance_cents - p_amount_cents,
    updated_at = now()
  WHERE account_id = p_account_id
  RETURNING platform_wallets.balance_cents INTO v_balance;

  INSERT INTO public.platform_usage_events (
    account_id,
    api_key_id,
    product_id,
    request_id,
    units,
    amount_cents,
    status,
    metadata
  ) VALUES (
    p_account_id,
    p_api_key_id,
    p_product_id,
    p_request_id,
    GREATEST(p_units, 1),
    p_amount_cents,
    'success',
    p_metadata
  )
  RETURNING id INTO v_event_id;

  INSERT INTO public.platform_ledger_entries (
    account_id,
    entry_type,
    amount_cents,
    usage_event_id,
    metadata
  ) VALUES (
    p_account_id,
    'usage',
    -p_amount_cents,
    v_event_id,
    p_metadata
  );

  RETURN QUERY SELECT true, v_balance, v_event_id, NULL::text;
END;
$$;

REVOKE ALL ON FUNCTION public.platform_consume_credits(uuid, integer, uuid, uuid, text, integer, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.platform_consume_credits(uuid, integer, uuid, uuid, text, integer, jsonb) TO service_role;
