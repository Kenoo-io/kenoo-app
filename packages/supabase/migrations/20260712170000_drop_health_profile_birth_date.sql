-- Remove duplicated birth date from health_profiles.
-- Source of truth is public.users.date_of_birth.

ALTER TABLE public.health_profiles
  DROP COLUMN IF EXISTS birth_date;
