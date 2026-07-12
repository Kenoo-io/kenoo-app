-- Health tracking schema (calorie logging, profiles, Strava, goals)
-- Mirrors ad_* conventions: user_id scoping, RLS, timestamps.

-- ---------------------------------------------------------------------------
-- health_profiles: per-user body metrics, BMR/TDEE, and macro targets
-- ---------------------------------------------------------------------------
CREATE TABLE public.health_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Biometrics
  sex text CHECK (sex IS NULL OR sex IN ('male', 'female', 'other')),
  birth_date date,
  height_cm numeric(6,2),
  current_weight_kg numeric(6,2),
  activity_level text NOT NULL DEFAULT 'moderate'
    CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active')),

  -- Energy calculations (kcal)
  bmr_calories integer,
  tdee_calories integer,
  calorie_target_daily integer,
  calorie_deficit_daily integer DEFAULT 0,

  -- Macro targets (grams per day)
  protein_target_g numeric(8,2),
  carbs_target_g numeric(8,2),
  fat_target_g numeric(8,2),
  fiber_target_g numeric(8,2),
  sugar_limit_g numeric(8,2),
  sodium_limit_mg integer,

  -- Goal
  goal_type text NOT NULL DEFAULT 'maintain'
    CHECK (goal_type IN ('lose_weight', 'maintain', 'gain_muscle', 'recomposition', 'custom')),
  target_weight_kg numeric(6,2),
  target_date date,

  -- Preferences
  unit_system text NOT NULL DEFAULT 'imperial'
    CHECK (unit_system IN ('metric', 'imperial')),
  timezone text NOT NULL DEFAULT 'America/New_York',
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,

  CONSTRAINT health_profiles_user_id_key UNIQUE (user_id)
);

COMMENT ON TABLE public.health_profiles IS
  'Health: per-user profile with body metrics, BMR/TDEE, calorie/macro targets, and preferences.';

CREATE INDEX health_profiles_user_id_idx ON public.health_profiles (user_id);

CREATE TRIGGER health_profiles_set_updated_at
  BEFORE UPDATE ON public.health_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- health_foods: reusable food catalog (manual, USDA, agent-estimated, etc.)
-- ---------------------------------------------------------------------------
CREATE TABLE public.health_foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  name text NOT NULL,
  brand text,
  description text,

  -- Serving basis
  serving_amount numeric(10,3) NOT NULL DEFAULT 1,
  serving_unit text NOT NULL DEFAULT 'serving',

  -- Nutrition per serving
  calories integer NOT NULL DEFAULT 0,
  protein_g numeric(8,2) NOT NULL DEFAULT 0,
  carbs_g numeric(8,2) NOT NULL DEFAULT 0,
  fat_g numeric(8,2) NOT NULL DEFAULT 0,
  fiber_g numeric(8,2) NOT NULL DEFAULT 0,
  sugar_g numeric(8,2) NOT NULL DEFAULT 0,
  sodium_mg integer NOT NULL DEFAULT 0,
  saturated_fat_g numeric(8,2) NOT NULL DEFAULT 0,
  cholesterol_mg integer NOT NULL DEFAULT 0,

  barcode text,
  external_source text,
  external_id text,
  source_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_favorite boolean NOT NULL DEFAULT false
);

COMMENT ON TABLE public.health_foods IS
  'Health: user food catalog with per-serving nutrition. Supports manual entry, imports, and agent estimates.';

CREATE INDEX health_foods_user_id_idx ON public.health_foods (user_id);
CREATE INDEX health_foods_user_name_idx ON public.health_foods (user_id, lower(name));
CREATE UNIQUE INDEX health_foods_user_external_key
  ON public.health_foods (user_id, external_source, external_id)
  WHERE external_source IS NOT NULL AND external_id IS NOT NULL;

CREATE TRIGGER health_foods_set_updated_at
  BEFORE UPDATE ON public.health_foods
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- health_meals: logged meals (breakfast, lunch, dinner, snack)
-- ---------------------------------------------------------------------------
CREATE TABLE public.health_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  meal_date date NOT NULL,
  logged_at timestamptz NOT NULL DEFAULT now(),
  meal_type text NOT NULL
    CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack', 'other')),

  name text,
  notes text,

  -- Cached totals (sum of items; updated by app/sync)
  calories integer NOT NULL DEFAULT 0,
  protein_g numeric(8,2) NOT NULL DEFAULT 0,
  carbs_g numeric(8,2) NOT NULL DEFAULT 0,
  fat_g numeric(8,2) NOT NULL DEFAULT 0,
  fiber_g numeric(8,2) NOT NULL DEFAULT 0,
  sugar_g numeric(8,2) NOT NULL DEFAULT 0,
  sodium_mg integer NOT NULL DEFAULT 0,

  source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'wallie', 'import', 'api')),
  source_metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

COMMENT ON TABLE public.health_meals IS
  'Health: meal logs grouped by day and meal type. Totals cached from health_meal_items.';

CREATE INDEX health_meals_user_date_idx ON public.health_meals (user_id, meal_date DESC, meal_type);
CREATE INDEX health_meals_user_logged_at_idx ON public.health_meals (user_id, logged_at DESC);

CREATE TRIGGER health_meals_set_updated_at
  BEFORE UPDATE ON public.health_meals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- health_meal_items: individual foods within a meal
-- ---------------------------------------------------------------------------
CREATE TABLE public.health_meal_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  meal_id uuid NOT NULL REFERENCES public.health_meals(id) ON DELETE CASCADE,
  food_id uuid REFERENCES public.health_foods(id) ON DELETE SET NULL,

  name text NOT NULL,
  quantity numeric(10,3) NOT NULL DEFAULT 1,
  serving_unit text NOT NULL DEFAULT 'serving',

  calories integer NOT NULL DEFAULT 0,
  protein_g numeric(8,2) NOT NULL DEFAULT 0,
  carbs_g numeric(8,2) NOT NULL DEFAULT 0,
  fat_g numeric(8,2) NOT NULL DEFAULT 0,
  fiber_g numeric(8,2) NOT NULL DEFAULT 0,
  sugar_g numeric(8,2) NOT NULL DEFAULT 0,
  sodium_mg integer NOT NULL DEFAULT 0,
  saturated_fat_g numeric(8,2) NOT NULL DEFAULT 0,

  notes text,
  estimate_confidence numeric(4,3) CHECK (estimate_confidence IS NULL OR (estimate_confidence >= 0 AND estimate_confidence <= 1)),
  source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'wallie', 'food_catalog', 'import', 'api')),
  source_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order smallint NOT NULL DEFAULT 0
);

COMMENT ON TABLE public.health_meal_items IS
  'Health: line items within a meal. Nutrition stored per logged quantity for agent estimates and catalog foods.';

CREATE INDEX health_meal_items_meal_id_idx ON public.health_meal_items (meal_id, sort_order);
CREATE INDEX health_meal_items_user_id_idx ON public.health_meal_items (user_id);
CREATE INDEX health_meal_items_food_id_idx ON public.health_meal_items (food_id) WHERE food_id IS NOT NULL;

CREATE TRIGGER health_meal_items_set_updated_at
  BEFORE UPDATE ON public.health_meal_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- health_daily_summaries: pre-aggregated daily stats for dashboards
-- ---------------------------------------------------------------------------
CREATE TABLE public.health_daily_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  summary_date date NOT NULL,

  calories_consumed integer NOT NULL DEFAULT 0,
  calories_burned integer NOT NULL DEFAULT 0,
  calories_net integer NOT NULL DEFAULT 0,

  protein_g numeric(8,2) NOT NULL DEFAULT 0,
  carbs_g numeric(8,2) NOT NULL DEFAULT 0,
  fat_g numeric(8,2) NOT NULL DEFAULT 0,
  fiber_g numeric(8,2) NOT NULL DEFAULT 0,
  sugar_g numeric(8,2) NOT NULL DEFAULT 0,
  sodium_mg integer NOT NULL DEFAULT 0,
  saturated_fat_g numeric(8,2) NOT NULL DEFAULT 0,

  calorie_target integer,
  calorie_remaining integer,
  water_ml integer NOT NULL DEFAULT 0,

  meal_count smallint NOT NULL DEFAULT 0,
  activity_count smallint NOT NULL DEFAULT 0,
  active_minutes integer NOT NULL DEFAULT 0,

  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  CONSTRAINT health_daily_summaries_user_date_key UNIQUE (user_id, summary_date)
);

COMMENT ON TABLE public.health_daily_summaries IS
  'Health: daily nutrition and activity rollups for fast dashboard queries and Wallie calorie-budget answers.';

CREATE INDEX health_daily_summaries_user_date_idx ON public.health_daily_summaries (user_id, summary_date DESC);

CREATE TRIGGER health_daily_summaries_set_updated_at
  BEFORE UPDATE ON public.health_daily_summaries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- health_weight_logs: body weight over time
-- ---------------------------------------------------------------------------
CREATE TABLE public.health_weight_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  logged_at timestamptz NOT NULL DEFAULT now(),
  weight_kg numeric(6,2) NOT NULL,
  body_fat_percent numeric(5,2),

  source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'wallie', 'scale', 'import')),
  notes text,
  source_metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

COMMENT ON TABLE public.health_weight_logs IS
  'Health: weight history for trend charts and goal tracking.';

CREATE INDEX health_weight_logs_user_logged_idx ON public.health_weight_logs (user_id, logged_at DESC);

CREATE TRIGGER health_weight_logs_set_updated_at
  BEFORE UPDATE ON public.health_weight_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- health_activities: Strava sync + manual workouts
-- ---------------------------------------------------------------------------
CREATE TABLE public.health_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_connection_id uuid REFERENCES public.user_connections(id) ON DELETE CASCADE,

  provider text NOT NULL DEFAULT 'manual'
    CHECK (provider IN ('strava', 'manual', 'apple_health', 'garmin', 'other')),
  provider_activity_id text,

  activity_type text NOT NULL
    CHECK (activity_type IN (
      'run', 'ride', 'swim', 'walk', 'hike', 'workout', 'yoga',
      'strength', 'crossfit', 'sport', 'other'
    )),

  name text,
  description text,
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  duration_seconds integer,
  distance_meters numeric(12,2),
  elevation_gain_meters numeric(10,2),

  calories_burned integer,
  avg_heart_rate smallint,
  max_heart_rate smallint,
  avg_speed_mps numeric(8,4),

  perceived_exertion smallint CHECK (perceived_exertion IS NULL OR (perceived_exertion >= 1 AND perceived_exertion <= 10)),
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

COMMENT ON TABLE public.health_activities IS
  'Health: workouts and activities from Strava (via user_connections) or manual entry. Feeds calorie burn and fitness goal tracking.';

CREATE INDEX health_activities_user_started_idx ON public.health_activities (user_id, started_at DESC);
CREATE INDEX health_activities_connection_idx ON public.health_activities (user_connection_id) WHERE user_connection_id IS NOT NULL;
CREATE UNIQUE INDEX health_activities_provider_activity_key
  ON public.health_activities (user_connection_id, provider_activity_id)
  WHERE user_connection_id IS NOT NULL AND provider_activity_id IS NOT NULL;

CREATE TRIGGER health_activities_set_updated_at
  BEFORE UPDATE ON public.health_activities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- health_sync_state: Strava / provider sync cursors (mirrors ad_sync_state)
-- ---------------------------------------------------------------------------
CREATE TABLE public.health_sync_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_connection_id uuid NOT NULL REFERENCES public.user_connections(id) ON DELETE CASCADE,

  provider text NOT NULL DEFAULT 'strava'
    CHECK (provider IN ('strava', 'apple_health', 'garmin', 'other')),
  sync_status text NOT NULL DEFAULT 'idle'
    CHECK (sync_status IN ('idle', 'syncing', 'error')),

  activity_cursor jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_full_sync_at timestamptz,
  last_incremental_sync_at timestamptz,
  last_error text,

  CONSTRAINT health_sync_state_connection_key UNIQUE (user_connection_id)
);

COMMENT ON TABLE public.health_sync_state IS
  'Health: sync progress and API cursors per connected fitness account (e.g. Strava).';

CREATE INDEX health_sync_state_user_id_idx ON public.health_sync_state (user_id);

CREATE TRIGGER health_sync_state_set_updated_at
  BEFORE UPDATE ON public.health_sync_state
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- health_goals: fitness and lifestyle goals
-- ---------------------------------------------------------------------------
CREATE TABLE public.health_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  name text NOT NULL,
  description text,
  goal_type text NOT NULL
    CHECK (goal_type IN (
      'workouts_per_week', 'daily_steps', 'weekly_distance_km',
      'weekly_active_minutes', 'weight_target', 'calorie_target',
      'protein_target', 'custom'
    )),

  target_value numeric(12,2) NOT NULL,
  target_unit text NOT NULL,
  period text NOT NULL DEFAULT 'weekly'
    CHECK (period IN ('daily', 'weekly', 'monthly', 'one_time')),

  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  is_active boolean NOT NULL DEFAULT true,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb
);

COMMENT ON TABLE public.health_goals IS
  'Health: user-defined fitness goals (e.g. workout 3x/week) for Wallie planning and dashboard tracking.';

CREATE INDEX health_goals_user_active_idx ON public.health_goals (user_id, is_active, start_date DESC);

CREATE TRIGGER health_goals_set_updated_at
  BEFORE UPDATE ON public.health_goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- health_goal_progress: periodic snapshots against goals
-- ---------------------------------------------------------------------------
CREATE TABLE public.health_goal_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  goal_id uuid NOT NULL REFERENCES public.health_goals(id) ON DELETE CASCADE,

  period_start date NOT NULL,
  period_end date NOT NULL,
  current_value numeric(12,2) NOT NULL DEFAULT 0,
  target_value numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'on_track', 'behind', 'ahead', 'completed', 'missed')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  CONSTRAINT health_goal_progress_goal_period_key UNIQUE (goal_id, period_start, period_end)
);

COMMENT ON TABLE public.health_goal_progress IS
  'Health: goal progress snapshots by period for streaks, weekly reviews, and Wallie coaching.';

CREATE INDEX health_goal_progress_user_idx ON public.health_goal_progress (user_id, period_start DESC);
CREATE INDEX health_goal_progress_goal_idx ON public.health_goal_progress (goal_id, period_start DESC);

CREATE TRIGGER health_goal_progress_set_updated_at
  BEFORE UPDATE ON public.health_goal_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security (matches ad_* pattern: user_id = auth.uid())
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'health_profiles',
    'health_foods',
    'health_meals',
    'health_meal_items',
    'health_daily_summaries',
    'health_weight_logs',
    'health_activities',
    'health_sync_state',
    'health_goals',
    'health_goal_progress'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (user_id = auth.uid())',
      tbl || '_select_own', tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid())',
      tbl || '_insert_own', tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())',
      tbl || '_update_own', tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (user_id = auth.uid())',
      tbl || '_delete_own', tbl
    );
  END LOOP;
END $$;
