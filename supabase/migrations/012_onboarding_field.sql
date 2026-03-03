-- Add onboarding_done flag to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_done BOOLEAN NOT NULL DEFAULT FALSE;

-- Existing users: mark as already onboarded
UPDATE public.profiles SET onboarding_done = TRUE WHERE created_at < NOW() - INTERVAL '1 minute';
