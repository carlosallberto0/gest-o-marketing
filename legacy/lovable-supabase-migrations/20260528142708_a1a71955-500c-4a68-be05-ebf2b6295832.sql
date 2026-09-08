ALTER TABLE public.pdvs
  ADD COLUMN IF NOT EXISTS manager_name TEXT,
  ADD COLUMN IF NOT EXISTS operating_hours TEXT;