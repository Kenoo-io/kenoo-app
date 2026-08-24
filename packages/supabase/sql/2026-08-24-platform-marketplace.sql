-- Kenoo Platform: API marketplace (prepaid credits, keys, usage).
-- Run against Supabase when enabling platform.kenoo.io.
-- Metered HTTP routes live on Platform at /api/v1 until api.kenoo.io exists.

INSERT INTO apps (slug, name, description, subdomain, is_active, icon_url)
VALUES (
  'platform',
  'Platform',
  'Kenoo API marketplace — products, keys, prepaid credits, and usage.',
  'platform',
  true,
  'https://assets.wallsentertainment.com/logo-variations/black-logo.png'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subdomain = EXCLUDED.subdomain,
  is_active = EXCLUDED.is_active;

CREATE TABLE IF NOT EXISTS public.platform_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  slug text NOT NULL,
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  unit_amount_cents integer NOT NULL DEFAULT 1,
  is_published boolean NOT NULL DEFAULT false,
  is_live boolean NOT NULL DEFAULT false,
  docs_path text,
  CONSTRAINT platform_products_slug_key UNIQUE (slug),
  CONSTRAINT platform_products_unit_amount_cents_check CHECK (unit_amount_cents >= 0)
);

CREATE TABLE IF NOT EXISTS public.platform_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  balance_cents bigint NOT NULL DEFAULT 0,
  auto_topup_enabled boolean NOT NULL DEFAULT false,
  auto_topup_threshold_cents integer NOT NULL DEFAULT 500,
  auto_topup_amount_cents integer NOT NULL DEFAULT 2500,
  stripe_customer_id text,
  stripe_payment_method_id text,
  CONSTRAINT platform_wallets_account_id_key UNIQUE (account_id),
  CONSTRAINT platform_wallets_balance_cents_check CHECK (balance_cents >= 0),
  CONSTRAINT platform_wallets_auto_topup_amount_check CHECK (auto_topup_amount_cents >= 100)
);

CREATE TABLE IF NOT EXISTS public.platform_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  created_by uuid,
  name text NOT NULL DEFAULT 'Default key',
  key_prefix text NOT NULL,
  key_hash text NOT NULL,
  last_used_at timestamptz,
  revoked_at timestamptz,
  CONSTRAINT platform_api_keys_key_hash_key UNIQUE (key_hash)
);

CREATE INDEX IF NOT EXISTS platform_api_keys_account_id_idx
  ON public.platform_api_keys (account_id)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS public.platform_ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  entry_type text NOT NULL,
  amount_cents integer NOT NULL,
  stripe_payment_intent_id text,
  usage_event_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS platform_ledger_entries_payment_intent_uidx
  ON public.platform_ledger_entries (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS platform_ledger_entries_account_created_idx
  ON public.platform_ledger_entries (account_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.platform_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  api_key_id uuid REFERENCES public.platform_api_keys(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.platform_products(id) ON DELETE SET NULL,
  request_id text,
  units integer NOT NULL DEFAULT 1,
  amount_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'success',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS platform_usage_events_request_id_uidx
  ON public.platform_usage_events (request_id)
  WHERE request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS platform_usage_events_account_created_idx
  ON public.platform_usage_events (account_id, created_at DESC);

COMMENT ON TABLE public.platform_products IS
  'Catalog of Kenoo APIs sold through Platform (price per request in USD cents).';
COMMENT ON TABLE public.platform_wallets IS
  'Prepaid credit balance and auto top-up settings per Kenoo account.';
COMMENT ON TABLE public.platform_api_keys IS
  'Hashed API keys for Platform. The secret is shown once at creation.';
COMMENT ON TABLE public.platform_ledger_entries IS
  'Wallet credits and debits (top-ups, usage, refunds).';
COMMENT ON TABLE public.platform_usage_events IS
  'Per-request usage log for Platform APIs.';

CREATE OR REPLACE FUNCTION public.platform_is_account_member(p_account_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.account_users au
    WHERE au.account_id = p_account_id
      AND au.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.platform_ensure_wallet(p_account_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.platform_wallets (account_id, balance_cents)
  VALUES (p_account_id, 0)
  ON CONFLICT (account_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_credit_wallet(
  p_account_id uuid,
  p_amount_cents integer,
  p_entry_type text,
  p_stripe_payment_intent_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance bigint;
BEGIN
  IF p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  PERFORM public.platform_ensure_wallet(p_account_id);

  IF p_stripe_payment_intent_id IS NOT NULL THEN
    PERFORM 1
    FROM public.platform_ledger_entries
    WHERE stripe_payment_intent_id = p_stripe_payment_intent_id;
    IF FOUND THEN
      SELECT balance_cents INTO v_balance
      FROM public.platform_wallets
      WHERE account_id = p_account_id;
      RETURN v_balance;
    END IF;
  END IF;

  UPDATE public.platform_wallets
  SET
    balance_cents = balance_cents + p_amount_cents,
    updated_at = now()
  WHERE account_id = p_account_id
  RETURNING balance_cents INTO v_balance;

  INSERT INTO public.platform_ledger_entries (
    account_id,
    entry_type,
    amount_cents,
    stripe_payment_intent_id,
    metadata
  ) VALUES (
    p_account_id,
    p_entry_type,
    p_amount_cents,
    p_stripe_payment_intent_id,
    p_metadata
  );

  RETURN v_balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_consume_credits(
  p_account_id uuid,
  p_amount_cents integer,
  p_api_key_id uuid,
  p_product_id uuid,
  p_request_id text,
  p_units integer DEFAULT 1,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(ok boolean, balance_cents bigint, usage_event_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance bigint;
  v_event_id uuid;
BEGIN
  IF p_amount_cents < 0 THEN
    RAISE EXCEPTION 'amount must be non-negative';
  END IF;

  IF p_request_id IS NOT NULL THEN
    SELECT pue.id, pw.balance_cents
      INTO v_event_id, v_balance
    FROM public.platform_usage_events pue
    JOIN public.platform_wallets pw ON pw.account_id = pue.account_id
    WHERE pue.request_id = p_request_id
    LIMIT 1;

    IF v_event_id IS NOT NULL THEN
      RETURN QUERY SELECT true, COALESCE(v_balance, 0), v_event_id;
      RETURN;
    END IF;
  END IF;

  PERFORM public.platform_ensure_wallet(p_account_id);

  SELECT pw.balance_cents
    INTO v_balance
  FROM public.platform_wallets pw
  WHERE pw.account_id = p_account_id
  FOR UPDATE;

  IF v_balance < p_amount_cents THEN
    RETURN QUERY SELECT false, v_balance, NULL::uuid;
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

  RETURN QUERY SELECT true, v_balance, v_event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.platform_is_account_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.platform_ensure_wallet(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.platform_credit_wallet(uuid, integer, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.platform_consume_credits(uuid, integer, uuid, uuid, text, integer, jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.platform_is_account_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_ensure_wallet(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.platform_credit_wallet(uuid, integer, text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.platform_consume_credits(uuid, integer, uuid, uuid, text, integer, jsonb) TO service_role;

ALTER TABLE public.platform_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_usage_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_products_select_published ON public.platform_products;
CREATE POLICY platform_products_select_published
  ON public.platform_products
  FOR SELECT
  TO authenticated, anon
  USING (is_published = true);

DROP POLICY IF EXISTS platform_wallets_select_member ON public.platform_wallets;
CREATE POLICY platform_wallets_select_member
  ON public.platform_wallets
  FOR SELECT
  TO authenticated
  USING (public.platform_is_account_member(account_id));

DROP POLICY IF EXISTS platform_api_keys_select_member ON public.platform_api_keys;
CREATE POLICY platform_api_keys_select_member
  ON public.platform_api_keys
  FOR SELECT
  TO authenticated
  USING (
    public.platform_is_account_member(account_id)
    AND revoked_at IS NULL
  );

DROP POLICY IF EXISTS platform_ledger_select_member ON public.platform_ledger_entries;
CREATE POLICY platform_ledger_select_member
  ON public.platform_ledger_entries
  FOR SELECT
  TO authenticated
  USING (public.platform_is_account_member(account_id));

DROP POLICY IF EXISTS platform_usage_select_member ON public.platform_usage_events;
CREATE POLICY platform_usage_select_member
  ON public.platform_usage_events
  FOR SELECT
  TO authenticated
  USING (public.platform_is_account_member(account_id));

INSERT INTO public.platform_products (
  slug, name, description, category, unit_amount_cents, is_published, is_live, docs_path
) VALUES
  (
    'ping',
    'Ping',
    'Health check for your integration. Confirms the key, wallet, and metering path are working.',
    'platform',
    1,
    true,
    true,
    '/docs/ping'
  ),
  (
    'web-search',
    'Web Search',
    'Live web search results from Kenoo search infrastructure. Priced per request.',
    'search',
    2,
    true,
    true,
    '/docs/web-search'
  ),
  (
    'company-intel',
    'Company Intel',
    'Company profiles and firmographics from Kenoo CRM intelligence. Coming online next.',
    'intelligence',
    5,
    true,
    false,
    '/docs/company-intel'
  ),
  (
    'people-intel',
    'People Intel',
    'Person enrichment and contact signals from Kenoo people data. Coming online next.',
    'intelligence',
    8,
    true,
    false,
    '/docs/people-intel'
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  unit_amount_cents = EXCLUDED.unit_amount_cents,
  is_published = EXCLUDED.is_published,
  is_live = EXCLUDED.is_live,
  docs_path = EXCLUDED.docs_path,
  updated_at = now();

GRANT SELECT ON public.platform_products TO authenticated, anon;
GRANT SELECT ON public.platform_wallets TO authenticated;
GRANT SELECT ON public.platform_api_keys TO authenticated;
GRANT SELECT ON public.platform_ledger_entries TO authenticated;
GRANT SELECT ON public.platform_usage_events TO authenticated;
